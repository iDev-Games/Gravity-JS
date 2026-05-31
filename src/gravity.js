/* Gravity.js v1.0.0 by iDev Games */
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
    angularDamping = 0.99;
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
        const rect = element.getBoundingClientRect();

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
            rotation: 0,
            velocityX: cached.velocityX,
            velocityY: cached.velocityY,
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
                fixedRotation: element.getAttribute('data-gravity-fixed-rotation') === 'true',
                sensor: element.getAttribute('data-gravity-sensor') === 'true',
                group: element.getAttribute('data-gravity-group') || 'default'
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
        bodyState.angularVelocity *= this.angularDamping;
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
                        this.handleCollision(bodyA, bodyB, collision);
                    }
                }
            }
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
        return this.aabbVsAabb(bodyA, bodyB);
    }

    aabbVsAabb(bodyA, bodyB) {
        const halfWidthA = bodyA.width / 2;
        const halfHeightA = bodyA.height / 2;
        const halfWidthB = bodyB.width / 2;
        const halfHeightB = bodyB.height / 2;

        const dx = bodyB.x - bodyA.x;
        const dy = bodyB.y - bodyA.y;

        const overlapX = halfWidthA + halfWidthB - Math.abs(dx);
        const overlapY = halfHeightA + halfHeightB - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
                const normalX = dx > 0 ? 1 : -1;
                return { penetration: overlapX, normalX, normalY: 0 };
            } else {
                const normalY = dy > 0 ? 1 : -1;
                return { penetration: overlapY, normalX: 0, normalY };
            }
        }
        return null;
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

        const percent = 0.8;
        const slop = 0.1;

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

        if (!bodyA.fixedRotation) {
            const rAx = normalX * bodyA.width / 2;
            const rAy = normalY * bodyA.height / 2;
            bodyA.angularVelocity -= (rAx * impulseY - rAy * impulseX) * bodyA.inverseInertia;
        }
        if (!bodyB.fixedRotation) {
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

        if (!bodyA.fixedRotation) {
            const rAx = normalX * bodyA.width / 2;
            const rAy = normalY * bodyA.height / 2;
            bodyA.angularVelocity -= (rAx * frictionImpulse * tangentNormalizedY - rAy * frictionImpulse * tangentNormalizedX) * bodyA.inverseInertia;
        }
        if (!bodyB.fixedRotation) {
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
            element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
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
