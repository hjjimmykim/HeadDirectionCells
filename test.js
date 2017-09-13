//--- Variables ---//

// MLE simulation parameters
var T = 100;    // Total number of iterations
var t = 500;    // Transition time

// Display properties
var width = window.innerWidth/2;
var height = 0.8*window.innerHeight;
var baselen = Math.min(width,height);
var compass = d3.select("#Compass")
var wCompass = parseInt(compass.style("width"));
var hCompass = parseInt(compass.style("height"));

// Neuron properties
var rMax = 1;   // Maximum firing rate
var sTrue = 0;  // Actual stimulus
var sEst = NaN;   // Estimated stimulus

// Initializing global variables
var e = document.getElementById("selectN"); // Extract N
var N = parseInt(e.value);      // Number of neurons
var circles = null;             // Graphics in Control
var neuronIndex = [];           // Neurons (contains angle pos)
var isCollectingSpikes = false; // Simulation ongoing or not
var arrayMSE = [];              // Mean squared errors (up to each time step)
    
//--- Math Functions ---//

// Non-negative modulus
var mod = function(n,m) {
    var remain = n % m;
    return remain >= 0 ? remain : remain + m;
}

// Distance on a circle
function wrapDistance(s1,s2) {
    return mod((s1-s2)+Math.PI,2*Math.PI) - Math.PI;
}

// Gaussian tuning curve
function gaussian(s,mu) {
    wd = wrapDistance(s,mu);
    return rMax*Math.exp(-Math.pow(wd,2)/(2*Math.pow(sigma,2)));
}

// Square tuning curve
function square(s,mu) {
    wd = wrapDistance(s,mu);
    if (wd < sigma) {
        return rMax;
    }
    else {
        return 0;
    }
}

// Sine tuning curve
function sine(s,mu) {
    wd = wrapDistance(s,mu);
    return Math.sin(wd/sigma);
}

// Poisson random number generator
function poiss(lambda) {
    var L = Math.exp(-lambda);
    var p = 1.0;
    var k = 0;
    
    do {
        k++;
        p *= Math.random();
    } while (p > L);
    
    return k-1;
}

//--- Display functions ---//

// Set Styles
function setStyles() {
    d3.select("html")
        .style("background", "lightyellow");

    d3.select("#Display")
        .style("position", "absolute")
        .style("top", "100px")
        .style("left", "10px");
      
    d3.select("#Network")
        .attr("width", width)
        .attr("height", height);
        
    var opt = d3.select("#Options");
    opt.style("position", "absolute")
        .style("top", "100px")
        .style("left", width+"px")

    var con = d3.select('#Control');
    con.style("position", "absolute")
        .style("top", 100 + parseInt(opt.style("height")) + "px")
        .style("left", width+"px");
        
    d3.select("#Compass")
        .attr("width", "250px")
        .attr("height", "250px")
        .style("background", "white");

    var sim = d3.select('#MLE');
    sim.style("position", "absolute")
        .style("top", "100px")
        .style("left", width + parseInt(con.style("width")) +"px")
        .style("padding-left","10px");
        
    d3.select('#MLEplot')
        .style("position", "absolute")
        .style("top", 100 + parseInt(opt.style("height")) + "px")
        .style("left", width + parseInt(con.style("width")) +"px")
        .style("padding-left","10px");
}

// Color neurons
function updateNetwork() {
    circles.style("fill", function (d,i) {return color(gaussian(d,sTrue));});
}
    
// Draw Network from scratch
function drawNetwork() {  
    // Neuron array (preferred angles)
    neuronIndex = Array.from(new Array(N), (x,i) => i/N * 2*Math.PI);

    // Color scheme
    color = d3.scaleLinear().domain([0,rMax])
        .interpolate(d3.interpolateHcl)
        .range([d3.rgb("#4682b4"),d3.rgb('#990000')]);
 
    // Delete circles
    d3.select('#Network')
        .selectAll('circle')
        .data([])
        .exit()
        .remove();
        
    // Create nodes
    circles = d3.select('#Network')
        .selectAll('circle')
        .data(neuronIndex).enter().append("circle");

    // Node locations
    circles.attr("cx", function (d,i) {return baselen/2*(1+0.5*Math.cos(-Math.PI/2 + 2*Math.PI*i/N));})
        .attr("cy", function (d,i) {return baselen/2*(1+0.5*Math.sin(-Math.PI/2 + 2*Math.PI*i/N));})
        .attr("r", 10)
        .style("fill", "steelblue");
        
    updateNetwork();
}

// Set relevant variables
function setVariables() {
    // Extract number of neurons
    N = parseInt(e.value);
    // Compass dimensions
    wCompass = parseInt(compass.style("width"));
    hCompass = parseInt(compass.style("height"));
}

// Compass control

// Coordinate of the arrowhead
var arrowCoord = []
// Draw compass when mouse hovers over Control
compass.on("mousemove", function() {var pt = d3.mouse(this); drawCompass(pt);});
// Compass line
var arrow = compass.append("line");

function drawHead(angle = 0) {
    setVariables();
    // Dimensions
    rHead = 30;
    rEyes = 5;
    offset = 0.5;   // Offset angle
    
    // Delete
    d3.select('#Compass')
        .selectAll('circle')
        .data([])
        .exit()
        .remove();
        
    // Calculate locations
    let xH = wCompass/2;
    let xR = wCompass/2 + rHead*Math.cos(-angle - offset + Math.PI/2);
    let xL = wCompass/2 + rHead*Math.cos(-angle + offset + Math.PI/2);
    let yH = hCompass/2;
    let yR = hCompass/2 - rHead*Math.sin(-angle - offset + Math.PI/2);
    let yL = hCompass/2 - rHead*Math.sin(-angle + offset + Math.PI/2);
    
    let xList = [xH,xR,xL];
    let yList = [yH,yR,yL];
        
    // Create head with eyes
    var headeyes = d3.select('#Compass')
        .selectAll('circle')
        .data([0,1,2])
        .enter().append("circle");
        
    headeyes.attr("cx", function(d,i) {return xList[i]})
        .attr("cy", function(d,i) {return yList[i]})
        .attr("r", function(d,i) {if (i===0) {return rHead} else {return rEyes}})
        .style("fill", function(d,i) {if (i===0) {return "orange"} else {return "red"}});
  
}

// Draw Compass
function drawCompass(pt) {
    setVariables();
    arrowCoord = [[wCompass/2, hCompass/2], pt];
    arrow.attr("x1", wCompass/2)
        .attr("y1", hCompass/2)
        .attr("x2", pt[0])
        .attr("y2", pt[1])
        .attr("stroke-width", 2)
        .attr("stroke", "red");
    
    // Extract true stimulus
    sTrue = Math.atan2(pt[1]-hCompass/2,pt[0]-wCompass/2) + Math.PI/2;
    
    // Draw head
    drawHead(sTrue);
    
    // Recolor neurons
    updateNetwork();
}

// Redraw upon resizing window
function redraw() {
    width = window.innerWidth/2;
    height = 0.8*window.innerHeight;
    baselen = Math.min(width,height);
    
    setStyles();
    drawNetwork();
    if (isCollectingSpikes) {
        deleteSpikes();
    }
}

window.addEventListener("resize", redraw);

// Reset function
function reSet() {
    setVariables();
    drawNetwork();
}

// Redraw upon N selection change
e.addEventListener("change", reSet, false);

// Slider
var slider = document.getElementById("sigmaSlider");
var output = document.getElementById("sigmaValue");
let sliderVal = parseInt(slider.value);
output.innerHTML = (sliderVal/100).toFixed(2);  // Initial value
var sigma = sliderVal/100;  // Standard deviation

slider.oninput = function() {
    let sliderVal = parseInt(this.value);
    output.innerHTML = (sliderVal/100).toFixed(2);
    sigma = sliderVal/100;
    reSet();
}

// Draw MSE plot
function drawMSE() {
    
}

// Delete spikes
function deleteSpikes() {
    // Delete spikes
    d3.select('#Network')
        .selectAll('line')
        .data([])
        .exit()
        .remove();
}

// Draw spikes
function drawSpikes(spikeIndex) {
    // Delete spikes
    deleteSpikes();
    
    // Create true stimulus
    var trueStimulus = d3.select('#Network')
        .selectAll('line')
        .data([sTrue])
        .enter()
        .append("line");
    
    // True stimulus location
    trueStimulus.attr("x1", baselen/2)
        .attr("y1", baselen/2)
        .attr("stroke-width", 2)
        .attr("stroke", "red")
        .attr("x2", function(d,i) {return baselen/2*(1+0.5*Math.cos(d-Math.PI/2));})
        .attr("y2", function(d,i) {return baselen/2*(1+0.5*Math.sin(d-Math.PI/2));});
        
    // Create estimated stimulus
    var estStimulus = d3.select('#Network')
        .selectAll('line')
        .data([sEst], function(d) {return d;})
        .enter()
        .append("line");
 
    // Estimated stimulus location
    estStimulus.attr("x1", baselen/2)
        .attr("y1", baselen/2)
        .attr("stroke-width", 2)
        .attr("stroke", "cyan")
        .attr("x2", function(d,i) {if (isNaN(d)) {return baselen/2;} else {return baselen/2*(1+0.5*Math.cos(d - Math.PI/2));}})
        .attr("y2", function(d,i) {if (isNaN(d)) {return baselen/2;} else {return baselen/2*(1+0.5*Math.sin(d - Math.PI/2));}});

    // Create spikes
    var spikes = d3.select('#Network')
        .selectAll('line')
        .data(spikeIndex, function(d) {return d;})
        .enter()
        .append("line");
        
    // New coordinates
    var x_new = spikeIndex.map(function(d,i) {return baselen/2*(1 + 0.1*d*Math.cos(-Math.PI/2 + 2*Math.PI*i/N));});
    var y_new = spikeIndex.map(function(d,i) {return baselen/2*(1 + 0.1*d*Math.sin(-Math.PI/2 + 2*Math.PI*i/N));});
    
    // Spike locations
    spikes.attr("x1", baselen/2)
        .attr("y1", baselen/2)
        .attr("stroke-width", 3)
        .attr("stroke", "black")
        .attr("x2",baselen/2)
        .attr("y2",baselen/2)
        .transition()
        .duration(0.5*t)
        .attr("x2", function (d,i) {return x_new[i];})
        .attr("y2", function (d,i) {return y_new[i];});
        

}

// Analyze spikes
function analyzeSpikes() {
    // Poisson sampling
    var spikeIndex = neuronIndex.map(function(e) {return poiss(gaussian(e,sTrue));});
    
    // Population vector estimate
    var x = neuronIndex.map(function(e) {return Math.cos(e);});
    var y = neuronIndex.map(function(e) {return Math.sin(e);});
    
    var xWeightedSum = 0;
    var yWeightedSum = 0;
    for (var i=0; i < spikeIndex.length; i++) {
        xWeightedSum += spikeIndex[i]*x[i];
        yWeightedSum += spikeIndex[i]*y[i];
    }
    
    // Check for zero response and calculate PopVec estimate and Squared Error
    if (xWeightedSum === 0 && yWeightedSum === 0) {
        sEst = NaN;
        var SE = Math.pow(Math.PI,2)/3;   // Expected SE for random guessing
    }
    else {
        sEst = Math.atan2(yWeightedSum,xWeightedSum);
        var SE = Math.pow(wrapDistance(sEst,sTrue),2);
    }
    
    
    // Record MSE
    if (arrayMSE.length === 0) {
        arrayMSE.push(SE);  // If first time step, just record
    }
    else {
        var arrayLen = arrayMSE.length;
        var lastEl = arrayMSE[arrayLen-1];
        
        arrayMSE.push(lastEl + (SE - lastEl)/arrayLen); // Incremental average
    }
    
    // Draw spikes
    drawSpikes(spikeIndex);
}


// Clean up spikes
function cleanUp() {
    isCollectingSpikes = false;
    document.getElementById("buttonMLE").innerHTML = 'Start';
    deleteSpikes();
    sEst = NaN;
    counter = 0;
    arraySE = [];
    arrayMSE = [];
}

// Setting up timer for delays
var timer = null;
var counter = 0;
// Start spike simulation
function collectSpikes() {
    if (!isCollectingSpikes) {
        isCollectingSpikes = true;
        document.getElementById("buttonMLE").innerHTML = 'Stop';

        // Repeat T iterations with delay t
        timer = setInterval(function() {
            counter++;
            analyzeSpikes();
            if (counter >= T) {
                setTimeout(function() {cleanUp();}, t);
                clearInterval(timer);
            }
        }, t);
    }
    else {
        cleanUp();
        clearInterval(timer);
    }
}

//--- Main ---//
setStyles();
setVariables();
drawNetwork();
drawHead();