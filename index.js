"use strict";

//
// html elements:
//
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');
let ctx = undefined;
const recursionDepthSlider = document.getElementById("recursion-depth-slider");
const fractalSelector = document.getElementById("fractal-selector");
const juliaValueSelector = document.getElementById("julia-value-selector");
const containerJuliaValueSelector = document.getElementById("container-julia-value-selector");
const colorPicker1 = document.getElementById("color-picker-1");
const colorPicker2 = document.getElementById("color-picker-2");
const swapColorsButton = document.getElementById("swap-colors-button");

//
// global variables:
//
const threshold = 4;

let color1 = colorPicker1.value;
let color2 = colorPicker2.value;

let maxIterations = recursionDepthSlider.value;

let zoomingIn = true;
let zoomInFactor = 0.9;
let zoomOutFactor = 1.1;

let isDragging = false;
const dragFactor = 0.75;
let lastDragPosX;
let lastDragPosY;

let selectedJuliaSetValues = 6;
let juliaSetValues = [
    { real: -0.4, imaginary: 0.6 },
    { real: 0.285, imaginary: 0 },
    { real: 0.285, imaginary: 0.01 },
    { real: 0.45, imaginary: 0.1428 },
    { real: -0.70176, imaginary: -0.3842 },
    { real: -0.835, imaginary: -0.2321 },
    { real: -0.8, imaginary: 0.156 },
    { real: -0.7269, imaginary: 0.1889 },
    { real: 0, imaginary: 0.8 },
    { real: 0.35, imaginary: 0.35 },
    { real: 0.4, imaginary: 0.4 }
];

const minXmandelbrot = -1.9;
const maxXmandelbrot = 1.1;
const minYmandelbrot = -1.5;
const maxYmandelbrot = 1.5;

const minXjuliaSet = -2;
const maxXjuliaSet = 2;
const minYjuliaSet = -2;
const maxYjuliaSet = 2;

// minimum and maximum boundaries for the complex plane
let minX = -1.9;
let maxX = 1.1;
let minY = -1.5;
let maxY = 1.5;


let currentMainFunction;
const mainFunctions = [];   // mainWebGL and mainNoWebGL

let selectedFractal = 0;
let fractalFunctions = []; // mandelbrot and julia-set

//
// fractal functions:
//
const mandelbrot = function (zx, zy, iteration, maxIteration) {

    let zxOriginal = zx;
    let zyOriginal = zy;

    while (zx * zx + zy * zy < threshold * threshold && iteration < maxIteration) {
        let xtemp = zx * zx - zy * zy;
        zy = 2 * zx * zy + zyOriginal;
        zx = xtemp + zxOriginal;
        iteration++;
    }
    return iteration;
}

const juliaSet = function (zx, zy, iteration, maxIteration) {

    while (zx * zx + zy * zy < threshold * threshold && iteration < maxIteration) {
        let xtemp = zx * zx - zy * zy;
        zy = 2 * zx * zy + juliaSetValues[selectedJuliaSetValues].imaginary;
        zx = xtemp + juliaSetValues[selectedJuliaSetValues].real;
        iteration++;
    }
    return iteration;
}

fractalFunctions.push(mandelbrot);
fractalFunctions.push(juliaSet);

const mainWebGL = function () {

    // console.log("mainWebGL");

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const vertexShaderSource = document.querySelector("#vertex-shader-2d").text;
    const fragmentShaderSource = document.querySelector("#fragment-shader-2d").text;

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

    // Collect all the info needed to use the shader program.
    // Look up which attribute our shader program is using
    // for aVertexPosition and look up uniform locations.
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        },
        uniformLocations: {
            resolution: gl.getUniformLocation(shaderProgram, "u_resolution"),
            maxIterations: gl.getUniformLocation(shaderProgram, "u_maxIterations"),
            minX: gl.getUniformLocation(shaderProgram, "u_minX"),
            maxX: gl.getUniformLocation(shaderProgram, "u_maxX"),
            minY: gl.getUniformLocation(shaderProgram, "u_minY"),
            maxY: gl.getUniformLocation(shaderProgram, "u_maxY"),
            c1: gl.getUniformLocation(shaderProgram, "u_c1"),
            c2: gl.getUniformLocation(shaderProgram, "u_c2"),
            selectedFractal: gl.getUniformLocation(shaderProgram, "u_selectedFractal"),
            juliaValue: gl.getUniformLocation(shaderProgram, "u_julia"),
        },
    };

    // Set clear color to black, fully transparent (white)
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    // create a rectangle out of 2 triangles that fills the entire canvas
    // the fragment shader then retrieves the color of every pixel position in that rectangle using mandelbrot/ julia-set formula
    const positions = [
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
    ];

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    const buffers = initBuffers(gl, positions);

    // Draw the scene
    drawScene(gl, programInfo, buffers);
    // console.log(gl.getError());
}

const mainNoWebGL = function () {

    // console.log("mainNoWebGL")

    // clear old canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // iterate through each pixel in the canvas
    for (let i = 0; i < canvas.width; i++) {
        for (let j = 0; j < canvas.height; j++) {

            // create complex plane coordinates
            // map the pixel position: 
            // --> center is in the middle (currently top left corner)
            // --> adjust boundaries
            let zx = map(i, 0, canvas.width, minX, maxX);
            let zy = map(j, 0, canvas.height, minY, maxY);

            let iteration = 0;
            let maxIteration = maxIterations;

            iteration = fractalFunctions[selectedFractal](zx, zy, iteration, maxIteration);

            let clr = getColorAsString(iteration);
            ctx.fillStyle = clr;
            ctx.fillRect(i, j, 1, 1);
        }
    }
}

mainFunctions.push(mainNoWebGL);
mainFunctions.push(mainWebGL);

// Only use webGL if avaiable
if (gl) {
    currentMainFunction = 1;
    mainWebGL();
}
else {
    alert(
        "Unable to initialize WebGL. Your browser or machine may not support it. Continuing without WebGL.",
    );
    currentMainFunction = 0;
    ctx = canvas.getContext("2d");
    mainNoWebGL();
}

setUpEventHandlers();

function zoom(event) {
    let zoomFactor;

    if (zoomingIn) {
        zoomFactor = zoomInFactor;
    }
    else {
        zoomFactor = zoomOutFactor;
    }

    // get click position
    const bounds = canvas.getBoundingClientRect();
    const clickX = event.clientX - bounds.left;
    const clickY = event.clientY - bounds.top;

    // convert click position to complex plane coordinates
    const clickA = map(clickX, 0, canvas.width, minX, maxX);
    let clickB;
    if (currentMainFunction == 1) {
        clickB = map(clickY, 0, canvas.height, maxY, minY);
    }
    else {
        clickB = map(clickY, 0, canvas.height, minY, maxY);
    }

    // calculate the new boundaries based on the mouse position
    minX = clickA - (clickA - minX) * zoomFactor;
    maxX = clickA + (maxX - clickA) * zoomFactor;
    minY = clickB - (clickB - minY) * zoomFactor;
    maxY = clickB + (maxY - clickB) * zoomFactor;
}

function drag(event) {
    // get click position
    const bounds = canvas.getBoundingClientRect();
    const clickX = event.clientX - bounds.left;
    const clickY = event.clientY - bounds.top;

    // convert click position to complex plane coordinates
    const clickA = map(clickX, 0, canvas.width, minX, maxX);
    const clickB = map(clickY, 0, canvas.height, minY, maxY);

    // calculate vector between current and last mouse position
    const deltaX = clickA - lastDragPosX;
    const deltaY = clickB - lastDragPosY;

    // calculate the new boundaries based on the mouse position
    minX = minX - deltaX * dragFactor;
    maxX = maxX - deltaX * dragFactor;
    minY = minY + deltaY * dragFactor;
    maxY = maxY + deltaY * dragFactor;

    // Update current click position
    const clickAnew = map(clickX, 0, canvas.width, minX, maxX);
    const clickBnew = map(clickY, 0, canvas.height, minY, maxY);
    lastDragPosX = clickAnew;
    lastDragPosY = clickBnew;
}

//
// utility functions:
//

// get color based on depth
// returns a canvas ctx usable RGB string
function getColorAsString(depth) {

    if (depth == maxIterations) {
        return (`rgb(0 0 0/ 1.0)`); // black
    }

    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    // Interpolate between the two colors based on depth
    let interpolatedColor = [];
    for (let i = 0; i < 3; i++) {
        let component = Math.round(map(depth, 0, maxIterations, c1[i], c2[i]));
        interpolatedColor.push(component);
    }

    let alpha = map(depth, 0, maxIterations, 1, 0.5);

    return (`rgb(${interpolatedColor[0]} ${interpolatedColor[1]} ${interpolatedColor[2]} / ${alpha})`);
}

// returns an RGB array
function getColorAsRGB(depth) {

    if (depth == maxIterations) {
        return [0.0, 0.0, 0.0, 1.0]; // black
    }

    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    // Interpolate between the two colors based on depth
    let interpolatedColor = [];
    for (let i = 0; i < 3; i++) {
        let component = Math.round(map(depth, 0, maxIterations, c1[i], c2[i]));
        interpolatedColor.push(component / 255.0);
    }

    let alpha = map(depth, 0, maxIterations, 1, 0.5);
    interpolatedColor.push(alpha);

    return interpolatedColor;
}

function hexToRgb(hex) {

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
        return;
    }
    let rgb = [];

    // parseInt automatically transforms hex values to decimal
    rgb.push(parseInt(result[1], 16));
    rgb.push(parseInt(result[2], 16));
    rgb.push(parseInt(result[3], 16));

    // divide by 255 to get a range from 0 to 1 
    rgb[0] = rgb[0] / 255.0;
    rgb[1] = rgb[1] / 255.0;
    rgb[2] = rgb[2] / 255.0;
    return rgb;
}

// map a value from one range to another range
function map(value, minInput, maxInput, minOutput, maxOutput) {
    return minOutput + (value - minInput) / (maxInput - minInput) * (maxOutput - minOutput);
}

//
// set up shaders functions:
//
// Initialize a shader program, so WebGL knows how to draw our data
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(
            `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                shaderProgram,
            )}`,
        );
        return null;
    }

    return shaderProgram;
}

// creates a shader of the given type, uploads the source and
// compiles it.
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(
            `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
        );
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

//
// init-buffers function:
//
function initBuffers(gl, positions) {

    const positionBuffer = initPositionBuffer(gl, positions);

    return {
        position: positionBuffer,
    };
}

function initPositionBuffer(gl, positions) {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return positionBuffer;
}

//
// draw-scene functions:
//
function drawScene(gl, programInfo, buffers) {

    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    setPositionAttribute(gl, buffers, programInfo)

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the uniform variables
    gl.uniform2f(programInfo.uniformLocations.resolution, canvas.width, canvas.height);
    gl.uniform1i(programInfo.uniformLocations.maxIterations, maxIterations);
    gl.uniform1f(programInfo.uniformLocations.minX, minX);
    gl.uniform1f(programInfo.uniformLocations.maxX, maxX);
    gl.uniform1f(programInfo.uniformLocations.minY, minY);
    gl.uniform1f(programInfo.uniformLocations.maxY, maxY);
    let c1 = hexToRgb(color1);
    let c2 = hexToRgb(color2);
    gl.uniform4f(programInfo.uniformLocations.c1, c1[0], c1[1], c1[2], 1.0);
    gl.uniform4f(programInfo.uniformLocations.c2, c2[0], c2[1], c2[2], 1.0);
    gl.uniform1i(programInfo.uniformLocations.selectedFractal, selectedFractal);
    gl.uniform2f(programInfo.uniformLocations.juliaValue, juliaSetValues[selectedJuliaSetValues].real, juliaSetValues[selectedJuliaSetValues].imaginary);

    const offset = 0;
    const vertexCount = 6; // 2 triangles
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
}

// Tell WebGL how to pull out the positions from the position
// buffer into the vertexPosition attribute.
function setPositionAttribute(gl, buffers, programInfo) {
    const numComponents = 2; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

//
// event handlers:
//
function setUpEventHandlers() {

    window.addEventListener("load", function () {
        fractalSelector.value = selectedFractal;
        juliaValueSelector.value = selectedJuliaSetValues;
        mainFunctions[currentMainFunction]();
    });

    fractalSelector.addEventListener("input", function () {
        selectedFractal = parseInt(fractalSelector.value);
        if (selectedFractal === 0) {
            containerJuliaValueSelector.hidden = true;
            containerJuliaValueSelector.disabled = true;
            minX = minXmandelbrot;
            maxX = maxXmandelbrot;
            minY = minYmandelbrot;
            maxY = maxYmandelbrot;
        }
        else if (selectedFractal === 1) {
            containerJuliaValueSelector.hidden = false;
            containerJuliaValueSelector.disabled = false;
            minX = minXjuliaSet;
            maxX = maxXjuliaSet;
            minY = minYjuliaSet;
            maxY = maxYjuliaSet;
        }
        mainFunctions[currentMainFunction]();
    });

    juliaValueSelector.addEventListener("input", function () {
        selectedJuliaSetValues = juliaValueSelector.value;
        mainFunctions[currentMainFunction]();
    });

    recursionDepthSlider.addEventListener("input", function () {
        maxIterations = recursionDepthSlider.value;
        mainFunctions[currentMainFunction]();
    });

    colorPicker1.addEventListener("input", function () {
        color1 = colorPicker1.value;
        mainFunctions[currentMainFunction]();
    });

    colorPicker2.addEventListener("input", function () {
        color2 = colorPicker2.value;
        mainFunctions[currentMainFunction]();
    });

    swapColorsButton.addEventListener("click", function () {
        let tmp = color1;
        color1 = color2;
        color2 = tmp;
        colorPicker1.value = color1;
        colorPicker2.value = color2;
        mainFunctions[currentMainFunction]();
    });

    canvas.addEventListener("mouseenter", function () {
        disableScrolling();
    });

    canvas.addEventListener("mouseleave", function () {
        enableScrolling();
        isDragging = false;
    });

    // user can zoom with scrollwheel
    canvas.addEventListener("wheel", function (event) {
        event.preventDefault();
        if (event.deltaY > 0) {
            zoomingIn = false;
        }
        else {
            zoomingIn = true;
        }
        zoom(event);
        mainFunctions[currentMainFunction]();
    });

    canvas.addEventListener("mousedown", function (event) {
        isDragging = true;
        const bounds = canvas.getBoundingClientRect();
        const clickX = event.clientX - bounds.left;
        const clickY = event.clientY - bounds.top;

        // convert click position to complex plane coordinates
        lastDragPosX = map(clickX, 0, canvas.width, minX, maxX);
        lastDragPosY = map(clickY, 0, canvas.height, minY, maxY);
    });

    canvas.addEventListener("mousemove", function (event) {
        if (isDragging) {
            drag(event);
            mainFunctions[currentMainFunction]();
        }
    });

    canvas.addEventListener("mouseup", function (event) {
        isDragging = false;
    });
}

function disableScrolling() {
    document.body.classList.add("disable-scrollbar");
}

function enableScrolling() {
    document.body.classList.remove("disable-scrollbar");
}