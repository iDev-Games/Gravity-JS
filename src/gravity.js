/* Gravity.js v1.1.0 by iDev Games */
class Gravity
{
    bodies = [];
    bodyData = new Map();
    gravityAttributesCache = new Map();
    spatialGrid = new Map();
    gridSize = 100;
    worldGravityX = 0;
    worldGravityY = 39.2;
    damping = 0.99;
    angularDamping = 0.98;
    velocityIterations = 6;
    positionIterations = 2;
    running = false;
    lastTime = 0;
    accumulator = 0;
    fixedTimeStep = 1000 / 60;
    animationFrameId = null;

    constructor() {
        this.gravityInit = this.gravityInit.bind(this);
        this.gravityLoop = this.gravityLoop.bind(this);
        this.gravityUpdate = this.gravityUpdate.bind(this);
        this.gravityResize = this.gravityResize.bind(this);
    }

    gravityInit() {
        this.bodies = document.querySelectorAll('body,.enable-gravity,[data-gravity]');
        this.bodies.forEach((element, index) => {
            element.index = index;
            this.setupBody(element);
        });
        this.startSimulation();
    }

    setupBody(element) {
        if (element === document.body) {
            this.setupWorldSettings(element);
            return;
        }

        const cached = this.getGravityOptions(element);

        // Temporarily remove transform to get actual unrotated dimensions
        const computedStyle = window.getComputedStyle(element);
        const originalTransform = element.style.transform;
        element.style.transform = 'none';
        const rect = element.getBoundingClientRect();
        element.style.transform = originalTransform;

        // Extract rotation from CSS transform
        const transform = computedStyle.transform;
        let initialRotation = 0;

        if (transform && transform !== 'none') {
            const values = transform.split('(')[1].split(')')[0].split(',');
            const a = parseFloat(values[0]);
            const b = parseFloat(values[1]);
            initialRotation = Math.atan2(b, a); // Get rotation in radians from matrix
        }

        // Allow data-gravity-rotation to override CSS if specified
        if (cached.rotation !== 0) {
            initialRotation = cached.rotation * (Math.PI / 180);
        }

        // Calculate initial velocity from directional attributes if present
        let initialVelocityX = cached.velocityX;
        let initialVelocityY = cached.velocityY;

        if (cached.velocityRight || cached.velocityLeft) {
            const right = cached.velocityRight ? parseFloat(cached.velocityRight) || 0 : 0;
            const left = cached.velocityLeft ? parseFloat(cached.velocityLeft) || 0 : 0;
            initialVelocityX = right - left;
        }
        if (cached.velocityUp || cached.velocityDown) {
            const down = cached.velocityDown ? parseFloat(cached.velocityDown) || 0 : 0;
            const up = cached.velocityUp ? parseFloat(cached.velocityUp) || 0 : 0;
            initialVelocityY = down - up;
        }

        const bodyState = {
            element: element,
            type: cached.type,
            shape: cached.shape,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            initialX: rect.left + rect.width / 2,
            initialY: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
            radius: cached.radius || Math.max(rect.width, rect.height) / 2,
            rotation: initialRotation,
            velocityX: initialVelocityX,
            velocityY: initialVelocityY,
            angularVelocity: 0,
            forceX: cached.forceX,
            forceY: cached.forceY,
            mass: cached.mass,
            inverseMass: cached.type === 'static' ? 0 : 1 / cached.mass,
            inertia: this.calculateInertia(cached.mass, rect.width, rect.height, cached.shape, cached.radius),
            inverseInertia: 0,
            restitution: cached.restitution,
            friction: cached.friction,
            density: cached.density,
            fixedRotation: cached.fixedRotation,
            sensor: cached.sensor,
            group: cached.group,
            sleeping: false,
            sleepTime: 0,
            colliding: false,
            collidingWith: new Set()
        };

        bodyState.inverseInertia = bodyState.fixedRotation || bodyState.type === 'static' ? 0 : 1 / bodyState.inertia;

        this.bodyData.set(element, bodyState);
        this.applyBodyClasses(element, bodyState);
        this.updateElement(element, bodyState);
    }

    calculateInertia(mass, width, height, shape, radius) {
        if (shape === 'circle') {
            return (mass * radius * radius) / 2;
        }
        return (mass * (width * width + height * height)) / 12;
    }

    setupWorldSettings(element) {
        const worldGravityX = element.getAttribute('data-gravity-world-gravity-x');
        const worldGravityY = element.getAttribute('data-gravity-world-gravity-y');
        const worldGravity = element.getAttribute('data-gravity-world-gravity');

        if (worldGravityX !== null) this.worldGravityX = parseFloat(worldGravityX);
        if (worldGravityY !== null) this.worldGravityY = parseFloat(worldGravityY);
        if (worldGravity !== null) this.worldGravityY = parseFloat(worldGravity);

        const damping = element.getAttribute('data-gravity-damping');
        const angularDamping = element.getAttribute('data-gravity-angular-damping');

        if (damping !== null) this.damping = parseFloat(damping);
        if (angularDamping !== null) this.angularDamping = parseFloat(angularDamping);
    }

    getGravityOptions(element) {
        let cached = this.gravityAttributesCache.get(element);

        if (!cached) {
            const type = element.getAttribute('data-gravity-type') || 'dynamic';
            const shape = element.getAttribute('data-gravity-shape') || 'box';

            cached = {
                type: type,
                shape: shape,
                mass: parseFloat(element.getAttribute('data-gravity-mass')) || 1,
                restitution: parseFloat(element.getAttribute('data-gravity-restitution')) || 0.3,
                friction: parseFloat(element.getAttribute('data-gravity-friction')) || 0.5,
                density: parseFloat(element.getAttribute('data-gravity-density')) || 1,
                velocityX: parseFloat(element.getAttribute('data-gravity-velocity-x')) || 0,
                velocityY: parseFloat(element.getAttribute('data-gravity-velocity-y')) || 0,
                forceX: parseFloat(element.getAttribute('data-gravity-force-x')) || 0,
                forceY: parseFloat(element.getAttribute('data-gravity-force-y')) || 0,
                radius: parseFloat(element.getAttribute('data-gravity-radius')) || null,
                rotation: parseFloat(element.getAttribute('data-gravity-rotation')) || 0,
                fixedRotation: element.getAttribute('data-gravity-fixed-rotation') === 'true',
                sensor: element.getAttribute('data-gravity-sensor') === 'true',
                group: element.getAttribute('data-gravity-group') || 'default',
                // CSS variable sources (for Keys.js integration)
                velocityRight: element.getAttribute('data-gravity-velocity-right') || null,
                velocityLeft: element.getAttribute('data-gravity-velocity-left') || null,
                velocityUp: element.getAttribute('data-gravity-velocity-up') || null,
                velocityDown: element.getAttribute('data-gravity-velocity-down') || null,
                forceRight: element.getAttribute('data-gravity-force-right') || null,
                forceLeft: element.getAttribute('data-gravity-force-left') || null,
                forceUp: element.getAttribute('data-gravity-force-up') || null,
                forceDown: element.getAttribute('data-gravity-force-down') || null,
                forceMultiplier: parseFloat(element.getAttribute('data-gravity-force-multiplier')) || 100
            };

            this.gravityAttributesCache.set(element, cached);
        }

        return cached;
    }

    applyBodyClasses(element, bodyState) {
        element.classList.add('gravity-body', `gravity-${bodyState.type}`, `gravity-shape-${bodyState.shape}`);
        if (bodyState.sensor) {
            element.classList.add('gravity-sensor');
        }
    }

    startSimulation() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.gravityLoop();
    }

    pauseSimulation() {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    resumeSimulation() {
        if (!this.running) {
            this.lastTime = performance.now();
            this.startSimulation();
        }
    }

    gravityLoop() {
        if (!this.running) return;

        const currentTime = performance.now();
        const deltaTime = Math.min(currentTime - this.lastTime, 100);
        this.lastTime = currentTime;

        this.accumulator += deltaTime;

        while (this.accumulator >= this.fixedTimeStep) {
            this.gravityUpdate(this.fixedTimeStep / 1000);
            this.accumulator -= this.fixedTimeStep;
        }

        this.animationFrameId = requestAnimationFrame(this.gravityLoop);
    }

    gravityUpdate(dt) {
        this.bodyData.forEach((bodyState, element) => {
            if (bodyState.type === 'static') return;

            this.integrateForces(bodyState, dt);
            this.integrateVelocity(bodyState, dt);
            this.applyDamping(bodyState);
            this.updateSleeping(bodyState, dt);
        });

        for (let i = 0; i < this.velocityIterations; i++) {
            this.clearSpatialGrid();
            this.buildSpatialGrid();
            this.solveCollisions();
        }

        this.bodyData.forEach((bodyState, element) => {
            if (bodyState.type === 'static') return;
            this.updateElement(element, bodyState);
        });
    }

    integrateForces(bodyState, dt) {
        if (bodyState.sleeping || bodyState.inverseMass === 0) return;

        // Read forces from CSS variables (for Keys.js integration)
        const cached = this.getGravityOptions(bodyState.element);

        let forceX = 0;
        let forceY = 0;

        // Helper function to read CSS variable(s) and sum their values
        const readCSSVars = (varNames) => {
            if (!varNames) return 0;
            const vars = varNames.split(',').map(v => v.trim());
            let total = 0;
            for (const varName of vars) {
                const value = parseFloat(getComputedStyle(bodyState.element).getPropertyValue(varName).trim()) || 0;
                total += value;
            }
            return total;
        };

        if (cached.forceRight) {
            forceX += readCSSVars(cached.forceRight);
        }
        if (cached.forceLeft) {
            forceX -= readCSSVars(cached.forceLeft);
        }
        if (cached.forceDown) {
            forceY += readCSSVars(cached.forceDown);
        }
        if (cached.forceUp) {
            forceY -= readCSSVars(cached.forceUp);
        }

        bodyState.forceX += forceX * cached.forceMultiplier;
        bodyState.forceY += forceY * cached.forceMultiplier;

        bodyState.velocityX += (this.worldGravityX + bodyState.forceX * bodyState.inverseMass) * dt * 3;
        bodyState.velocityY += (this.worldGravityY + bodyState.forceY * bodyState.inverseMass) * dt * 3;

        bodyState.forceX = 0;
        bodyState.forceY = 0;
    }

    integrateVelocity(bodyState, dt) {
        if (bodyState.sleeping) return;

        const maxVelocity = 800;
        const speed = Math.sqrt(bodyState.velocityX * bodyState.velocityX + bodyState.velocityY * bodyState.velocityY);
        if (speed > maxVelocity) {
            const scale = maxVelocity / speed;
            bodyState.velocityX *= scale;
            bodyState.velocityY *= scale;
        }

        bodyState.x += bodyState.velocityX * dt * 3;
        bodyState.y += bodyState.velocityY * dt * 3;
        bodyState.rotation += bodyState.angularVelocity * dt;
    }

    applyDamping(bodyState) {
        bodyState.velocityX *= this.damping;
        bodyState.velocityY *= this.damping;

        // Skip angular physics for circles (they don't visually rotate)
        if (bodyState.shape === 'circle') {
            bodyState.angularVelocity *= this.angularDamping;
            return;
        }

        // Apply righting torque to settle boxes on flat sides
        let angularDampingFactor = this.angularDamping;

        // Normalize rotation to 0-2π range
        const normalizedRotation = ((bodyState.rotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        const angle = normalizedRotation * (180 / Math.PI);

        // Find nearest 90° increment (flat side)
        const targetAngle = Math.round(angle / 90) * 90;
        const angleDiff = (targetAngle - angle) * (Math.PI / 180);

        const speed = Math.sqrt(bodyState.velocityX * bodyState.velocityX + bodyState.velocityY * bodyState.velocityY);
        const angSpeed = Math.abs(bodyState.angularVelocity);

        // Only apply righting torque if box is nearly horizontal (not tilted on a slope)
        // Allow 15° tolerance around horizontal (0° or 180°)
        const nearHorizontal = (angle < 15 || (angle > 165 && angle < 195) || angle > 345);

        // When box is moving slowly AND nearly horizontal, apply torque to rotate to nearest flat side
        if (speed < 5 && angSpeed < 1 && nearHorizontal) {
            // Stronger torque when nearly stopped
            const torqueStrength = speed < 1 && angSpeed < 0.2 ? 0.08 : 0.03;
            bodyState.angularVelocity += angleDiff * torqueStrength;

            // Extra damping when settling
            angularDampingFactor = 0.92;
        }

        bodyState.angularVelocity *= angularDampingFactor;
    }

    updateSleeping(bodyState, dt) {
        const velocityThreshold = 0.5;
        const sleepTimeThreshold = 0.5;

        const speed = Math.sqrt(bodyState.velocityX * bodyState.velocityX + bodyState.velocityY * bodyState.velocityY);

        if (speed < velocityThreshold && Math.abs(bodyState.angularVelocity) < 0.1) {
            bodyState.sleepTime += dt;
            if (bodyState.sleepTime > sleepTimeThreshold) {
                bodyState.sleeping = true;
                bodyState.element.classList.add('gravity-sleeping');
                bodyState.element.classList.remove('gravity-awake');
            }
        } else {
            bodyState.sleepTime = 0;
            if (bodyState.sleeping) {
                bodyState.sleeping = false;
                bodyState.element.classList.remove('gravity-sleeping');
                bodyState.element.classList.add('gravity-awake');
            }
        }
    }

    clearSpatialGrid() {
        this.spatialGrid.clear();
    }

    buildSpatialGrid() {
        this.bodyData.forEach((bodyState, element) => {
            const minX = Math.floor((bodyState.x - bodyState.width / 2) / this.gridSize);
            const maxX = Math.floor((bodyState.x + bodyState.width / 2) / this.gridSize);
            const minY = Math.floor((bodyState.y - bodyState.height / 2) / this.gridSize);
            const maxY = Math.floor((bodyState.y + bodyState.height / 2) / this.gridSize);

            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    const key = `${x},${y}`;
                    if (!this.spatialGrid.has(key)) {
                        this.spatialGrid.set(key, []);
                    }
                    this.spatialGrid.get(key).push(bodyState);
                }
            }
        });
    }

    solveCollisions() {
        const checkedPairs = new Set();
        const currentCollisions = new Map();
        let collisionCount = 0;

        // Collect all collisions first (especially important for circles)
        const allCollisions = [];

        this.spatialGrid.forEach((bodiesInCell) => {
            for (let i = 0; i < bodiesInCell.length; i++) {
                for (let j = i + 1; j < bodiesInCell.length; j++) {
                    const bodyA = bodiesInCell[i];
                    const bodyB = bodiesInCell[j];

                    const pairKey = this.getPairKey(bodyA, bodyB);
                    if (checkedPairs.has(pairKey)) continue;
                    checkedPairs.add(pairKey);

                    if (!this.shouldCollide(bodyA, bodyB)) continue;

                    const collision = this.detectCollision(bodyA, bodyB);
                    if (collision) {
                        collisionCount++;
                        currentCollisions.set(pairKey, { bodyA, bodyB });
                        allCollisions.push({ bodyA, bodyB, collision });
                    }
                }
            }
        });

        // For circles, only resolve the deepest penetration per circle
        const circleDeepestCollisions = new Map();
        const nonCircleCollisions = [];

        allCollisions.forEach(({ bodyA, bodyB, collision }) => {
            const isCircleA = bodyA.shape === 'circle';
            const isCircleB = bodyB.shape === 'circle';

            if (isCircleA || isCircleB) {
                const circle = isCircleA ? bodyA : bodyB;
                const circleId = circle.element.id;

                const existing = circleDeepestCollisions.get(circleId);
                if (!existing || collision.penetration > existing.collision.penetration) {
                    circleDeepestCollisions.set(circleId, { bodyA, bodyB, collision });
                }
            } else {
                nonCircleCollisions.push({ bodyA, bodyB, collision });
            }
        });

        // Resolve only deepest circle collision per circle
        circleDeepestCollisions.forEach(({ bodyA, bodyB, collision }) => {
            this.handleCollision(bodyA, bodyB, collision);
        });

        // Resolve all non-circle collisions
        nonCircleCollisions.forEach(({ bodyA, bodyB, collision }) => {
            this.handleCollision(bodyA, bodyB, collision);
        });

        this.updateCollisionStates(currentCollisions);
    }

    getPairKey(bodyA, bodyB) {
        const idA = bodyA.element.index;
        const idB = bodyB.element.index;
        return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
    }

    shouldCollide(bodyA, bodyB) {
        if (bodyA.type === 'static' && bodyB.type === 'static') return false;
        if (bodyA.sleeping && bodyB.sleeping) return false;
        if (bodyA.group !== 'default' && bodyB.group !== 'default' && bodyA.group !== bodyB.group) return false;
        return true;
    }

    detectCollision(bodyA, bodyB) {
        const isCircleA = bodyA.shape === 'circle';
        const isCircleB = bodyB.shape === 'circle';

        if (isCircleA && isCircleB) {
            return this.circleVsCircle(bodyA, bodyB);
        } else if (isCircleA && !isCircleB) {
            return this.circleVsObb(bodyA, bodyB);
        } else if (!isCircleA && isCircleB) {
            const collision = this.circleVsObb(bodyB, bodyA);
            if (collision) {
                // Flip the normal since we swapped the bodies
                collision.normalX = -collision.normalX;
                collision.normalY = -collision.normalY;
            }
            return collision;
        } else {
            return this.obbVsObb(bodyA, bodyB);
        }
    }

    // Circle vs Circle collision
    circleVsCircle(circleA, circleB) {
        const dx = circleB.x - circleA.x;
        const dy = circleB.y - circleA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radiusSum = circleA.radius + circleB.radius;

        if (distance < radiusSum) {
            const penetration = radiusSum - distance;
            const normalX = distance > 0 ? dx / distance : 1;
            const normalY = distance > 0 ? dy / distance : 0;

            return {
                penetration,
                normalX,
                normalY
            };
        }

        return null;
    }

    // Circle vs OBB collision using SAT
    circleVsObb(circle, box) {
        const boxCorners = this.getBoxCorners(box);

        // Find the closest point on the box to the circle center
        let closestPoint = null;
        let minDistSq = Infinity;
        let bestEdgeNormalX = 0;
        let bestEdgeNormalY = 0;

        // Check each edge of the box
        for (let i = 0; i < boxCorners.length; i++) {
            const p1 = boxCorners[i];
            const p2 = boxCorners[(i + 1) % boxCorners.length];

            // Vector from p1 to p2 (edge)
            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            const edgeLengthSq = edgeX * edgeX + edgeY * edgeY;
            const edgeLength = Math.sqrt(edgeLengthSq);

            // Edge normal (perpendicular, pointing outward)
            const edgeNormalX = -edgeY / edgeLength;
            const edgeNormalY = edgeX / edgeLength;

            // Vector from p1 to circle center
            const toCircleX = circle.x - p1.x;
            const toCircleY = circle.y - p1.y;

            // Project circle center onto edge
            let t = (toCircleX * edgeX + toCircleY * edgeY) / edgeLengthSq;
            t = Math.max(0, Math.min(1, t)); // Clamp to edge

            // Closest point on this edge
            const pointX = p1.x + t * edgeX;
            const pointY = p1.y + t * edgeY;

            const distSq = (circle.x - pointX) ** 2 + (circle.y - pointY) ** 2;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestPoint = { x: pointX, y: pointY };

                // Use edge normal if circle is close to the edge
                const dx = circle.x - box.x;
                const dy = circle.y - box.y;
                const dotProduct = dx * edgeNormalX + dy * edgeNormalY;

                bestEdgeNormalX = dotProduct > 0 ? edgeNormalX : -edgeNormalX;
                bestEdgeNormalY = dotProduct > 0 ? edgeNormalY : -edgeNormalY;
            }
        }

        const distance = Math.sqrt(minDistSq);

        if (distance < circle.radius) {
            const penetration = circle.radius - distance;

            // Always use direction from closest point to circle center for stability
            const normalX = distance > 0.01 ? (circle.x - closestPoint.x) / distance : bestEdgeNormalX;
            const normalY = distance > 0.01 ? (circle.y - closestPoint.y) / distance : bestEdgeNormalY;

            return {
                penetration,
                normalX,
                normalY
            };
        }

        return null;
    }

    // Get the 4 corners of an oriented box
    getBoxCorners(body) {
        const hw = body.width / 2;
        const hh = body.height / 2;
        const cos = Math.cos(body.rotation);
        const sin = Math.sin(body.rotation);

        // Local corners (relative to center)
        const corners = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];

        // Rotate and translate to world space
        return corners.map(corner => ({
            x: body.x + (corner.x * cos - corner.y * sin),
            y: body.y + (corner.x * sin + corner.y * cos)
        }));
    }

    // Get the axes to test for SAT (perpendicular to each edge)
    getAxes(corners) {
        const axes = [];
        for (let i = 0; i < corners.length; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % corners.length];
            const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            // Perpendicular to edge (normal)
            const normal = { x: -edge.y, y: edge.x };
            const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
            axes.push({ x: normal.x / len, y: normal.y / len });
        }
        return axes;
    }

    // Project corners onto an axis
    projectOntoAxis(corners, axis) {
        let min = corners[0].x * axis.x + corners[0].y * axis.y;
        let max = min;

        for (let i = 1; i < corners.length; i++) {
            const projection = corners[i].x * axis.x + corners[i].y * axis.y;
            if (projection < min) min = projection;
            if (projection > max) max = projection;
        }

        return { min, max };
    }

    // SAT collision detection for Oriented Bounding Boxes
    obbVsObb(bodyA, bodyB) {
        const cornersA = this.getBoxCorners(bodyA);
        const cornersB = this.getBoxCorners(bodyB);

        const axesA = this.getAxes(cornersA);
        const axesB = this.getAxes(cornersB);
        const axes = [...axesA, ...axesB];

        let minOverlap = Infinity;
        let smallestAxis = null;

        for (const axis of axes) {
            const projA = this.projectOntoAxis(cornersA, axis);
            const projB = this.projectOntoAxis(cornersB, axis);

            const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);

            if (overlap <= 0) {
                // Separating axis found - no collision
                return null;
            }

            if (overlap < minOverlap) {
                minOverlap = overlap;
                smallestAxis = axis;
            }
        }

        // Collision detected! Return collision info
        // Make sure normal points from A to B
        const dx = bodyB.x - bodyA.x;
        const dy = bodyB.y - bodyA.y;
        const dot = dx * smallestAxis.x + dy * smallestAxis.y;

        if (dot < 0) {
            smallestAxis.x = -smallestAxis.x;
            smallestAxis.y = -smallestAxis.y;
        }

        return {
            penetration: minOverlap,
            normalX: smallestAxis.x,
            normalY: smallestAxis.y
        };
    }


    handleCollision(bodyA, bodyB, collision) {
        this.dispatchCollisionEvents(bodyA, bodyB);

        if (bodyA.sensor || bodyB.sensor) return;

        this.resolveCollision(bodyA, bodyB, collision);
    }

    resolveCollision(bodyA, bodyB, collision) {
        let { penetration, normalX, normalY } = collision;

        if (penetration > 50) {
            penetration = 50;
        }

        if (bodyA.sleeping) {
            bodyA.sleeping = false;
            bodyA.sleepTime = 0;
            bodyA.element.classList.remove('gravity-sleeping');
            bodyA.element.classList.add('gravity-awake');
        }
        if (bodyB.sleeping) {
            bodyB.sleeping = false;
            bodyB.sleepTime = 0;
            bodyB.element.classList.remove('gravity-sleeping');
            bodyB.element.classList.add('gravity-awake');
        }

        // Use slightly stronger correction for circles to prevent sticking
        const isCircleInvolved = bodyA.shape === 'circle' || bodyB.shape === 'circle';
        const percent = isCircleInvolved ? 0.85 : 0.8;
        const slop = isCircleInvolved ? 0.05 : 0.1;

        const totalInverseMass = bodyA.inverseMass + bodyB.inverseMass;
        if (totalInverseMass === 0) return;

        const correctionAmount = Math.max(penetration - slop, 0) / totalInverseMass * percent;

        bodyA.x -= normalX * correctionAmount * bodyA.inverseMass;
        bodyA.y -= normalY * correctionAmount * bodyA.inverseMass;
        bodyB.x += normalX * correctionAmount * bodyB.inverseMass;
        bodyB.y += normalY * correctionAmount * bodyB.inverseMass;

        const relativeVelocityX = bodyB.velocityX - bodyA.velocityX;
        const relativeVelocityY = bodyB.velocityY - bodyA.velocityY;

        const velocityAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY;

        if (velocityAlongNormal > 0) return;

        const restitution = Math.min(bodyA.restitution, bodyB.restitution);
        const impulseScalar = -(1 + restitution) * velocityAlongNormal / totalInverseMass;

        const impulseX = impulseScalar * normalX;
        const impulseY = impulseScalar * normalY;

        bodyA.velocityX -= impulseX * bodyA.inverseMass;
        bodyA.velocityY -= impulseY * bodyA.inverseMass;
        bodyB.velocityX += impulseX * bodyB.inverseMass;
        bodyB.velocityY += impulseY * bodyB.inverseMass;

        // Apply rotational impulse (only for boxes, circles don't rotate visually)
        if (!bodyA.fixedRotation && bodyA.shape !== 'circle') {
            const rAx = normalX * bodyA.width / 2;
            const rAy = normalY * bodyA.height / 2;
            bodyA.angularVelocity -= (rAx * impulseY - rAy * impulseX) * bodyA.inverseInertia;
        }
        if (!bodyB.fixedRotation && bodyB.shape !== 'circle') {
            const rBx = -normalX * bodyB.width / 2;
            const rBy = -normalY * bodyB.height / 2;
            bodyB.angularVelocity += (rBx * impulseY - rBy * impulseX) * bodyB.inverseInertia;
        }

        this.applyFriction(bodyA, bodyB, collision, impulseScalar);
    }

    applyFriction(bodyA, bodyB, collision, normalImpulse) {
        const { normalX, normalY } = collision;

        const relativeVelocityX = bodyB.velocityX - bodyA.velocityX;
        const relativeVelocityY = bodyB.velocityY - bodyA.velocityY;

        const tangentX = relativeVelocityX - (relativeVelocityX * normalX + relativeVelocityY * normalY) * normalX;
        const tangentY = relativeVelocityY - (relativeVelocityX * normalX + relativeVelocityY * normalY) * normalY;

        const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
        if (tangentLength < 0.001) return;

        const tangentNormalizedX = tangentX / tangentLength;
        const tangentNormalizedY = tangentY / tangentLength;

        const totalInverseMass = bodyA.inverseMass + bodyB.inverseMass;
        if (totalInverseMass === 0) return;

        const friction = Math.sqrt(bodyA.friction * bodyB.friction);

        const jt = -tangentLength / totalInverseMass;
        const maxFriction = Math.abs(friction * normalImpulse);
        const frictionImpulse = Math.abs(jt) < maxFriction ? jt : (jt < 0 ? -maxFriction : maxFriction);

        bodyA.velocityX -= frictionImpulse * tangentNormalizedX * bodyA.inverseMass;
        bodyA.velocityY -= frictionImpulse * tangentNormalizedY * bodyA.inverseMass;
        bodyB.velocityX += frictionImpulse * tangentNormalizedX * bodyB.inverseMass;
        bodyB.velocityY += frictionImpulse * tangentNormalizedY * bodyB.inverseMass;

        if (!bodyA.fixedRotation && bodyA.shape !== 'circle') {
            const rAx = normalX * bodyA.width / 2;
            const rAy = normalY * bodyA.height / 2;
            bodyA.angularVelocity -= (rAx * frictionImpulse * tangentNormalizedY - rAy * frictionImpulse * tangentNormalizedX) * bodyA.inverseInertia;
        }
        if (!bodyB.fixedRotation && bodyB.shape !== 'circle') {
            const rBx = -normalX * bodyB.width / 2;
            const rBy = -normalY * bodyB.height / 2;
            bodyB.angularVelocity += (rBx * frictionImpulse * tangentNormalizedY - rBy * frictionImpulse * tangentNormalizedX) * bodyB.inverseInertia;
        }
    }

    dispatchCollisionEvents(bodyA, bodyB) {
        const wasCollidingA = bodyA.collidingWith.has(bodyB.element);
        const wasCollidingB = bodyB.collidingWith.has(bodyA.element);

        if (!wasCollidingA) {
            bodyA.collidingWith.add(bodyB.element);
            bodyA.colliding = true;
            bodyA.element.classList.add('gravity-colliding');
            if (bodyB.element.id) {
                bodyA.element.classList.add(`gravity-collision-${bodyB.element.id}`);
            }

            const event = new CustomEvent('gravitycollision', {
                detail: {
                    element: bodyA.element,
                    other: bodyB.element,
                    otherId: bodyB.element.id || null
                },
                bubbles: true
            });
            bodyA.element.dispatchEvent(event);

            if (bodyB.element.id) {
                bodyA.element.setAttribute('data-collision-with', bodyB.element.id);
            }
        }

        if (!wasCollidingB) {
            bodyB.collidingWith.add(bodyA.element);
            bodyB.colliding = true;
            bodyB.element.classList.add('gravity-colliding');
            if (bodyA.element.id) {
                bodyB.element.classList.add(`gravity-collision-${bodyA.element.id}`);
            }

            const event = new CustomEvent('gravitycollision', {
                detail: {
                    element: bodyB.element,
                    other: bodyA.element,
                    otherId: bodyA.element.id || null
                },
                bubbles: true
            });
            bodyB.element.dispatchEvent(event);

            if (bodyA.element.id) {
                bodyB.element.setAttribute('data-collision-with', bodyA.element.id);
            }
        }
    }

    updateCollisionStates(currentCollisions) {
        this.bodyData.forEach((bodyState, element) => {
            const stillColliding = new Set();

            currentCollisions.forEach(({ bodyA, bodyB }) => {
                if (bodyA === bodyState) {
                    stillColliding.add(bodyB.element);
                } else if (bodyB === bodyState) {
                    stillColliding.add(bodyA.element);
                }
            });

            bodyState.collidingWith.forEach((otherElement) => {
                if (!stillColliding.has(otherElement)) {
                    bodyState.collidingWith.delete(otherElement);
                    if (otherElement.id) {
                        bodyState.element.classList.remove(`gravity-collision-${otherElement.id}`);
                    }

                    const event = new CustomEvent('gravityexit', {
                        detail: {
                            element: bodyState.element,
                            other: otherElement,
                            otherId: otherElement.id || null
                        },
                        bubbles: true
                    });
                    bodyState.element.dispatchEvent(event);

                    bodyState.element.removeAttribute('data-collision-with');
                }
            });

            if (bodyState.collidingWith.size === 0) {
                bodyState.colliding = false;
                bodyState.element.classList.remove('gravity-colliding');
            }
        });
    }

    updateElement(element, bodyState) {
        const isGlobal = element.getAttribute('data-gravity-global') === 'true';
        const styleTarget = isGlobal ? document.documentElement.style : element.style;
        const idSuffix = isGlobal && element.id ? `-${element.id}` : '';

        const speed = Math.sqrt(bodyState.velocityX * bodyState.velocityX + bodyState.velocityY * bodyState.velocityY);

        styleTarget.setProperty(`--gravity-x${idSuffix}`, `${Math.round(bodyState.x)}px`);
        styleTarget.setProperty(`--gravity-y${idSuffix}`, `${Math.round(bodyState.y)}px`);
        styleTarget.setProperty(`--gravity-rotation${idSuffix}`, `${Math.round(bodyState.rotation * (180 / Math.PI))}deg`);
        styleTarget.setProperty(`--gravity-velocity-x${idSuffix}`, Math.round(bodyState.velocityX * 10) / 10);
        styleTarget.setProperty(`--gravity-velocity-y${idSuffix}`, Math.round(bodyState.velocityY * 10) / 10);
        styleTarget.setProperty(`--gravity-speed${idSuffix}`, Math.round(speed * 10) / 10);
        styleTarget.setProperty(`--gravity-collision${idSuffix}`, bodyState.colliding ? 1 : 0);

        element.setAttribute('data-velocity-x', Math.round(bodyState.velocityX * 10) / 10);
        element.setAttribute('data-velocity-y', Math.round(bodyState.velocityY * 10) / 10);
        element.setAttribute('data-speed', Math.round(speed * 10) / 10);

        if (bodyState.type !== 'static') {
            const offsetX = bodyState.x - bodyState.initialX;
            const offsetY = bodyState.y - bodyState.initialY;
            element.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${bodyState.rotation}rad)`;
        }
    }

    gravityResize() {
        this.bodyData.forEach((bodyState, element) => {
            if (element === document.body) return;
            const rect = element.getBoundingClientRect();
            bodyState.width = rect.width;
            bodyState.height = rect.height;
            bodyState.inertia = this.calculateInertia(bodyState.mass, rect.width, rect.height, bodyState.shape, bodyState.radius);
            bodyState.inverseInertia = bodyState.fixedRotation || bodyState.type === 'static' ? 0 : 1 / bodyState.inertia;
        });
    }

    applyForce(elementId, x, y) {
        const element = document.getElementById(elementId);
        if (!element) return;
        const bodyState = this.bodyData.get(element);
        if (!bodyState) return;
        bodyState.forceX += x;
        bodyState.forceY += y;
        this.wakeBody(bodyState);
    }

    applyImpulse(elementId, x, y) {
        const element = document.getElementById(elementId);
        if (!element) return;
        const bodyState = this.bodyData.get(element);
        if (!bodyState) return;
        bodyState.velocityX += x * bodyState.inverseMass;
        bodyState.velocityY += y * bodyState.inverseMass;
        this.wakeBody(bodyState);
    }

    setVelocity(elementId, x, y) {
        const element = document.getElementById(elementId);
        if (!element) return;
        const bodyState = this.bodyData.get(element);
        if (!bodyState) return;
        bodyState.velocityX = x;
        bodyState.velocityY = y;
        this.wakeBody(bodyState);
    }

    wakeBody(bodyState) {
        if (bodyState.sleeping) {
            bodyState.sleeping = false;
            bodyState.sleepTime = 0;
            bodyState.element.classList.remove('gravity-sleeping');
            bodyState.element.classList.add('gravity-awake');
        }
    }

    getBody(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return null;
        return this.bodyData.get(element);
    }

    resetBody(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        const bodyState = this.bodyData.get(element);
        if (!bodyState || bodyState.type === 'static') return;

        const cached = this.getGravityOptions(element);

        bodyState.x = bodyState.initialX;
        bodyState.y = bodyState.initialY;
        bodyState.velocityX = cached.velocityX;
        bodyState.velocityY = cached.velocityY;
        bodyState.angularVelocity = 0;
        bodyState.rotation = 0;
        bodyState.forceX = cached.forceX;
        bodyState.forceY = cached.forceY;
        bodyState.sleeping = false;
        bodyState.sleepTime = 0;

        element.style.transform = `translate(0px, 0px) rotate(0rad)`;
        element.classList.remove('gravity-sleeping');
        element.classList.add('gravity-awake');
    }

    resetBodies(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        const bodies = container.querySelectorAll('[data-gravity]');
        bodies.forEach(element => {
            if (element.id) {
                this.resetBody(element.id);
            }
        });
    }
}
window.gravity = new Gravity();

window.addEventListener('load', gravity.gravityInit, { passive: true });
window.addEventListener('resize', gravity.gravityResize, { passive: true });
