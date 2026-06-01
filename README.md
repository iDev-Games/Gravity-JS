# Gravity.js

[![License](https://img.shields.io/badge/License-MIT-blue)](#license)
[![CodePen Demos](https://img.shields.io/badge/CodePen-Demos-black?logo=codepen)](https://codepen.io/collection/JYOKxx)

**Gravity.js** is a lightweight physics engine that renders using CSS. Configure physics bodies, collisions, and dynamics entirely through data attributes - no JavaScript required for basic physics interactions.

🎮 **[View Live Demos & Examples on CodePen](https://codepen.io/collection/JYOKxx)** 🎮

Perfect for creating browser-based games, interactive experiences, and physics simulations without the overhead of canvas rendering. Native DOM elements become physics bodies!

---

## What is Gravity.js?

Gravity.js brings real physics to the browser using:
- **CSS Rendering**: No canvas overhead - uses native DOM positioning
- **Data Attribute Configuration**: Set up physics bodies with HTML attributes
- **Collision Detection**: SAT (Separating Axis Theorem) for OBB (Oriented Bounding Box)
- **Zero Dependencies**: Standalone library, works great with State.js and Keys.js
- **Lightweight**: Minimal footprint, maximum performance

---

## Features

✅ **Physics Body Types**: Dynamic, Static, and Kinematic bodies
✅ **Shape Support**: Box (OBB with rotation)
✅ **Realistic Physics**: Mass, restitution, friction, forces, impulses, and rotation
✅ **Collision Detection**: SAT-based OBB collision with automatic resolution and events
✅ **Collision Sensors**: Trigger zones without physical response
✅ **Collision Groups**: Filter which bodies can collide
✅ **CSS Variables**: Access physics state in your CSS
✅ **State.js Integration**: Collisions trigger state changes
✅ **Keys.js Integration**: Player input for interactive games
✅ **Sleep System**: Bodies at rest are optimized automatically

---

## Installation

### NPM
```bash
npm i @idevgames/gravity-js
```

### Direct Include
```html
<script src="/js/gravity.js"></script>
```

### CDN
```html
<script src="https://cdn.jsdelivr.net/npm/@idevgames/gravity-js/src/gravity.js"></script>
```

---

## Quick Start

### Basic Physics Body
```html
<div data-gravity data-gravity-type="dynamic">
    I'm a physics body!
</div>
```

### Create a Ground
```html
<div data-gravity data-gravity-type="static" style="position:absolute; bottom:0; width:100%; height:40px;">
    Ground
</div>
```

### Complete Example
```html
<!DOCTYPE html>
<html>
<head>
    <script src="gravity.js"></script>
</head>
<body data-gravity-world-gravity="9.8">
    <!-- Falling box -->
    <div data-gravity
         data-gravity-type="dynamic"
         data-gravity-mass="1"
         data-gravity-restitution="0.5"
         style="position:absolute; top:50px; left:100px; width:50px; height:50px; background:red;">
    </div>

    <!-- Static ground -->
    <div data-gravity
         data-gravity-type="static"
         style="position:absolute; bottom:0; width:100%; height:40px; background:green;">
    </div>
</body>
</html>
```

---

## Physics Body Types

Set the body type with `data-gravity-type`:

### Dynamic
```html
<div data-gravity data-gravity-type="dynamic">
```
- Affected by gravity and forces
- Collides with all body types
- Default body type

### Static
```html
<div data-gravity data-gravity-type="static">
```
- Never moves
- Infinite mass
- Perfect for ground, walls, platforms

### Kinematic
```html
<div data-gravity data-gravity-type="kinematic">
```
- Moves but has infinite mass
- Not affected by forces
- Perfect for moving platforms

---

## Shape Types

Set collision shape with `data-gravity-shape`:

### Box (OBB)
```html
<div data-gravity data-gravity-shape="box">
```
- Default shape
- Uses element's width and height
- Oriented Bounding Box collision using SAT
- Supports rotation at any angle
- Automatically detects rotation from CSS `transform: rotate()`

## Physics Properties

### Mass
```html
<div data-gravity data-gravity-mass="2">
```
- Affects momentum and force response
- Default: `1`

### Restitution (Bounciness)
```html
<div data-gravity data-gravity-restitution="0.8">
```
- How much velocity is retained after collision
- Range: `0` (no bounce) to `1` (perfect bounce)
- Default: `0.3`

### Friction
```html
<div data-gravity data-gravity-friction="0.7">
```
- Surface friction during collisions
- Range: `0` (slippery) to `1` (sticky)
- Default: `0.5`

### Density
```html
<div data-gravity data-gravity-density="2">
```
- Material density
- Default: `1`

### Fixed Rotation
```html
<div data-gravity data-gravity-fixed-rotation="true">
```
- Prevents body from rotating
- Useful for characters and upright objects
- Default: `false`

### Initial Rotation
```html
<div data-gravity style="transform: rotate(45deg);">
```
- Automatically reads CSS `transform: rotate()` for initial rotation
- Collision box rotates with the element
- Can also use `data-gravity-rotation="45"` (in degrees)

---

## Initial Velocity & Forces

### Initial Velocity (Static)
```html
<div data-gravity
     data-gravity-velocity-x="10"
     data-gravity-velocity-y="-5">
```
- Set starting velocity with X/Y values
- X: horizontal, Y: vertical

### Initial Velocity (Directional)
```html
<div data-gravity
     data-gravity-velocity-right="300"
     data-gravity-velocity-up="200">
```
- Set starting velocity with directional values
- Right/Left are combined: `right - left`
- Up/Down are combined: `down - up`
- Perfect for jumps: `data-gravity-velocity-up="300"`

### Continuous Forces (Static)
```html
<div data-gravity
     data-gravity-force-x="2"
     data-gravity-force-y="0">
```
- Applied every physics update
- Use for constant propulsion

### Dynamic Forces (CSS Variables)
```html
<div data-gravity
     data-gravity-force-right="--key-d, --key-right"
     data-gravity-force-left="--key-a, --key-left"
     data-gravity-force-up="--key-w, --key-up"
     data-gravity-force-down="--key-s, --key-down"
     data-gravity-force-multiplier="80">
```
- Read forces from CSS variables (perfect for Keys.js integration)
- Accepts comma-separated CSS variable names (values are summed)
- Right/Left forces are combined: `(right - left) * multiplier`
- Up/Down forces are combined: `(down - up) * multiplier`
- Use with Keys.js for declarative player control

---

## CSS Variables

Gravity.js exposes physics state as CSS variables for dynamic styling:

```css
.my-element {
    /* Position */
    left: var(--gravity-x);
    top: var(--gravity-y);

    /* Rotation */
    transform: rotate(var(--gravity-rotation));

    /* Velocity-based effects */
    opacity: calc(var(--gravity-speed) / 100);

    /* Collision-based effects */
    background: calc(var(--gravity-collision) * 255, 0, 0);
}
```

### Available CSS Variables
- `--gravity-x` - Horizontal position (px)
- `--gravity-y` - Vertical position (px)
- `--gravity-rotation` - Rotation angle (deg)
- `--gravity-velocity-x` - Horizontal velocity
- `--gravity-velocity-y` - Vertical velocity
- `--gravity-speed` - Total speed magnitude
- `--gravity-collision` - `1` when colliding, `0` otherwise

---

## Collision Detection

Collisions are automatically detected and resolved. When a collision occurs:

### CSS Classes Added
```css
.gravity-colliding {
    /* Applied to bodies currently in collision */
}

.gravity-collision-playerId {
    /* Applied when colliding with element id="playerId" */
}
```

### Custom Events Dispatched
```javascript
element.addEventListener('gravitycollision', (e) => {
    console.log('Collision with:', e.detail.other);
    console.log('Other ID:', e.detail.otherId);
});

element.addEventListener('gravityexit', (e) => {
    console.log('Stopped colliding with:', e.detail.other);
});
```

### Data Attributes Updated
```html
<!-- Automatically updated on collision -->
<div data-collision-with="coinId">
```

---

## Collision Sensors (Triggers)

Create trigger zones that detect collisions without physical response:

```html
<div data-gravity
     data-gravity-type="static"
     data-gravity-sensor="true"
     id="checkpoint"
     style="position:absolute; left:200px; top:100px; width:50px; height:50px;">
</div>
```

Perfect for:
- Checkpoint zones
- Collectible items
- Trigger areas
- Event zones

---

## Collision Groups

Filter which bodies can collide:

```html
<!-- Player group -->
<div data-gravity data-gravity-group="player"></div>

<!-- Enemy group -->
<div data-gravity data-gravity-group="enemy"></div>

<!-- Default group (collides with everything) -->
<div data-gravity data-gravity-group="default"></div>
```

Bodies only collide with:
- Other bodies in the same group
- Bodies in the `default` group

---

## World Settings

Configure global physics on the `<body>` element:

```html
<body data-gravity-world-gravity="9.8"
      data-gravity-world-gravity-x="0"
      data-gravity-world-gravity-y="9.8"
      data-gravity-damping="0.99"
      data-gravity-angular-damping="0.99">
```

### World Attributes
- `data-gravity-world-gravity` - Sets both X and Y gravity
- `data-gravity-world-gravity-x` - Horizontal gravity (default: `0`)
- `data-gravity-world-gravity-y` - Vertical gravity (default: `9.8`)
- `data-gravity-damping` - Velocity damping (default: `0.99`)
- `data-gravity-angular-damping` - Rotation damping (default: `0.99`)

---

## JavaScript API

While Gravity.js works without JavaScript, you can use these methods for advanced control:

### Apply Force
```javascript
gravity.applyForce('playerId', 50, 0); // Apply continuous force
```

### Apply Impulse
```javascript
gravity.applyImpulse('playerId', 0, -300); // One-time force (jump)
```

### Set Velocity
```javascript
gravity.setVelocity('playerId', 10, 0); // Set velocity directly
```

### Get Body Data
```javascript
const body = gravity.getBody('playerId');
console.log(body.x, body.y, body.velocityX, body.velocityY);
```

### Pause/Resume Simulation
```javascript
gravity.pauseSimulation();
gravity.resumeSimulation();
```

---

## Integration with State.js

Gravity.js works seamlessly with [State.js](https://github.com/iDev-Games/State-JS) for game state management:

```html
<!-- Player with state tracking -->
<div id="player"
     data-gravity
     data-state
     data-state-watch="collision-with,velocity-x,velocity-y">
</div>

<!-- Coin sensor that triggers state changes -->
<div id="coin"
     data-gravity
     data-gravity-sensor="true"
     data-state
     data-state-trigger
     data-state-bind="score"
     data-state-increment="10">
</div>

<!-- Score display -->
<div id="score"
     data-state
     data-score="0"
     data-state-watch="score">
    Score: <span data-state-display="score">0</span>
</div>
```

When player collides with coin:
1. Gravity.js detects collision
2. Updates `data-collision-with` attribute
3. State.js watches attribute change
4. Increments score automatically

---

## Integration with Keys.js

Combine with [Keys.js](https://github.com/iDev-Games/Keys-JS) for player input - **NO JavaScript required!**

### Declarative Integration (Recommended)

Keys.js sets CSS variables that Gravity.js can read automatically:

```html
<script src="https://cdn.jsdelivr.net/npm/@idevgames/keys-js/src/keys.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@idevgames/gravity-js/src/gravity.js"></script>

<!-- Container with Keys.js watching WASD keys -->
<div data-keys
     data-keys-watch="w,a,s,d"
     data-keys-prevent="w,a,s,d"
     data-keys-var="true">

    <!-- Player controlled by keyboard - ZERO JavaScript needed! -->
    <div id="player"
         data-gravity
         data-gravity-type="dynamic"
         data-gravity-fixed-rotation="true"
         data-gravity-force-right="--key-d, --key-right"
         data-gravity-force-left="--key-a, --key-left"
         data-gravity-force-down="--key-s, --key-down"
         data-gravity-force-up="--key-w, --key-up"
         data-gravity-force-multiplier="80">
    </div>
</div>
```

**How it works:**
- Keys.js sets `--key-*` CSS variables (0 when released, 1 when pressed)
- Gravity.js reads these via `data-gravity-force-right/left/up/down` attributes
- Each attribute accepts comma-separated CSS variable names (e.g., `--key-d, --key-right`)
- Multiple variables are summed together automatically
- Forces are automatically combined: right - left for X, down - up for Y
- `data-gravity-force-multiplier` scales the force strength
- No JavaScript required - pure CSS variable integration!

### JavaScript Integration (Advanced)

For more control, use the JavaScript API:

```html
<script src="keys.js"></script>
<script src="gravity.js"></script>

<script>
    // Jump on spacebar
    document.addEventListener('keydown', () => {
        if (keys.isKeyDown('space')) {
            gravity.applyImpulse('player', 0, -300);
        }
    });

    // Move with arrow keys
    setInterval(() => {
        const vec = keys.getArrowVector();
        gravity.applyForce('player', vec.x * 50, 0);
    }, 16);
</script>
```

---

## Complete Game Example

```html
<!DOCTYPE html>
<html>
<head>
    <script src="state.js"></script>
    <script src="keys.js"></script>
    <script src="gravity.js"></script>
    <style>
        .player {
            position: absolute;
            width: 40px;
            height: 40px;
            background: blue;
        }
        .ground {
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 40px;
            background: green;
        }
        .coin {
            position: absolute;
            width: 30px;
            height: 30px;
            background: gold;
            border-radius: 50%;
        }
        .coin.gravity-colliding {
            display: none;
        }
    </style>
</head>
<body data-gravity-world-gravity="9.8">
    <!-- Score -->
    <div data-state data-score="0" data-state-watch="score">
        Score: <span data-state-display="score">0</span>
    </div>

    <!-- Player -->
    <div id="player" class="player"
         data-gravity
         data-gravity-type="dynamic"
         data-gravity-mass="1"
         data-gravity-fixed-rotation="true"
         style="top:100px; left:100px;">
    </div>

    <!-- Coin -->
    <div id="coin" class="coin"
         data-gravity
         data-gravity-type="static"
         data-gravity-sensor="true"
         data-gravity-radius="15"
         data-state
         data-state-trigger
         data-state-bind="score"
         data-state-attr="score"
         data-state-increment="10"
         style="top:200px; left:300px;">
    </div>

    <!-- Ground -->
    <div class="ground"
         data-gravity
         data-gravity-type="static">
    </div>

    <script>
        // Jump on spacebar
        document.addEventListener('keydown', () => {
            if (keys.isKeyDown('space')) {
                gravity.applyImpulse('player', 0, -300);
            }
        });

        // Move with arrow keys
        setInterval(() => {
            const vec = keys.getArrowVector();
            if (vec.x !== 0) {
                gravity.applyForce('player', vec.x * 100, 0);
            }
        }, 16);
    </script>
</body>
</html>
```

---

## Browser Support

Gravity.js works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires:
- ES6 class support
- requestAnimationFrame
- CSS custom properties (variables)
- Map and Set

---

## Performance

Gravity.js is optimized for performance:
- ✅ Spatial grid for broad-phase collision detection
- ✅ Sleep system for bodies at rest
- ✅ Efficient attribute caching
- ✅ Fixed timestep physics simulation
- ✅ requestAnimationFrame for smooth rendering

---

## Companion Libraries

### Complete Browser Game Engine Stack

**Gravity.js** (Physics)
Physics simulation, collision detection, and dynamics

**[State.js](https://github.com/iDev-Games/State-JS)** (State Management)
Game state, variables, and reactive data binding

**[Keys.js](https://github.com/iDev-Games/Keys-JS)** (Input)
Keyboard input handling and key state tracking

Together they form a complete, zero-dependency game engine for the browser!

---

## Data Attribute Reference

### Body Configuration
| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-gravity` | - | - | Enables physics on element |
| `data-gravity-type` | `dynamic\|static\|kinematic` | `dynamic` | Body type |
| `data-gravity-shape` | `box` | `box` | Collision shape |
| `data-gravity-mass` | number | `1` | Body mass |
| `data-gravity-restitution` | 0-1 | `0.3` | Bounciness |
| `data-gravity-friction` | 0-1 | `0.5` | Surface friction |
| `data-gravity-density` | number | `1` | Material density |
| `data-gravity-fixed-rotation` | boolean | `false` | Prevent rotation |
| `data-gravity-sensor` | boolean | `false` | Trigger-only collider |
| `data-gravity-group` | string | `default` | Collision group |

### Initial Motion
| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-gravity-velocity-x` | number | `0` | Initial horizontal velocity |
| `data-gravity-velocity-y` | number | `0` | Initial vertical velocity |
| `data-gravity-force-x` | number | `0` | Continuous horizontal force |
| `data-gravity-force-y` | number | `0` | Continuous vertical force |

### Directional Motion
| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-gravity-velocity-right` | number | `0` | Initial rightward velocity |
| `data-gravity-velocity-left` | number | `0` | Initial leftward velocity |
| `data-gravity-velocity-up` | number | `0` | Initial upward velocity (perfect for jumps!) |
| `data-gravity-velocity-down` | number | `0` | Initial downward velocity |
| `data-gravity-force-right` | string | - | CSS variable(s) for rightward force (e.g., `--key-d, --key-right`) |
| `data-gravity-force-left` | string | - | CSS variable(s) for leftward force (e.g., `--key-a, --key-left`) |
| `data-gravity-force-up` | string | - | CSS variable(s) for upward force (e.g., `--key-w, --key-up`) |
| `data-gravity-force-down` | string | - | CSS variable(s) for downward force (e.g., `--key-s, --key-down`) |
| `data-gravity-force-multiplier` | number | `100` | Multiplier for directional force values |

### World Settings (on `<body>`)
| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-gravity-world-gravity` | number | `9.8` | Global gravity (X and Y) |
| `data-gravity-world-gravity-x` | number | `0` | Horizontal gravity |
| `data-gravity-world-gravity-y` | number | `9.8` | Vertical gravity |
| `data-gravity-damping` | 0-1 | `0.99` | Velocity damping |
| `data-gravity-angular-damping` | 0-1 | `0.99` | Rotation damping |

---

## License

MIT License - feel free to use in personal and commercial projects!

---

## Author

Created by **iDev Games**

Follow for updates:
- [GitHub](https://github.com/iDev-Games)
- [Dev.to](https://dev.to/idevgames)

---

## Contributing

Contributions welcome! Please open issues and pull requests on GitHub.

---

**Gravity.js** - Turn the browser into a physics-powered game engine! 🎮⚡
