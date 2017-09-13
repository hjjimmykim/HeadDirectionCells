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
var e = document.getElementById("selectN");
var N = parseInt(e.value);
var circles = null;
var neuronIndex = null;
var isCollectingSpikes = false; // Simulation ongoing or not
    
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

    d3.select("#Control")
        .style("position", "absolute")
        .style("top", 100 + parseInt(opt.style("height")) + "px")
        .style("left", width+"px")
        
    d3.select("#Compass")
        .attr("width", "250px")
        .attr("height", "250px")
        .style("background", "white");

    d3.select("#MLE")
        .style("position", "absolute")
        .style("top", "100px")
        .style("left", width + parseInt(opt.style("width")) +"px")
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
        .attr("x2", function(d,i) {return baselen/2*(1+0.5*Math.cos(-Math.PI/2 + 2*Math.PI*d/N));})
        .attr("y2", function(d,i) {return baselen/2*(1+0.5*Math.sin(-Math.PI/2 + 2*Math.PI*d/N));})
        
    // Create spikes
    var spikes = d3.select('#Network')
        .selectAll('line')
        .data(neuronIndex).enter().append("line");
        
    // Spike locations
    spikes.attr("x1", baselen/2)
        .attr("y1", baselen/2)
        .attr("stroke-width", 2)
        .attr("stroke", "black")
        .attr("x2",baselen/2)
        .attr("y2",baselen/2)
        .transition()
        .duration(t)
        .attr("x2", function (d,i) {return baselen/2*(1 + 0.1*spikeIndex[i]*Math.cos(-Math.PI/2 + 2*Math.PI*i/N));})
        .attr("y2", function (d,i) {return baselen/2*(1 + 0.1*spikeIndex[i]*Math.sin(-Math.PI/2 + 2*Math.PI*i/N));});
        
    // Create estimated stimulus
    var estStimulus = d3.select('#Network')
        .selectAll('line')
        .data([sEst])
        .enter()
        .append("line");
    
    // Estimated stimulus location
    estStimulus.attr("x1", baselen/2)
        .attr("y1", baselen/2)
        .attr("stroke-width", 2)
        .attr("stroke", "cyan")
        .attr("x2", function(d,i) {if (isNaN(d)) {return baselen/2;} else {return baselen/2*(1+0.5*Math.cos(-Math.PI/2 + 2*Math.PI*d/N));}})
        .attr("y2", function(d,i) {if (isNaN(d)) {return baselen/2;} else {return baselen/2*(1+0.5*Math.sin(-Math.PI/2 + 2*Math.PI*d/N));}})
}

// Analyze spikes
function analyzeSpikes() {
    // Poisson sampling
    var spikeIndex = neuronIndex.map(function(e) {return poiss(gaussian(e,sTrue))});
    
    // Population vector estimate
    
    // Draw spikes
    drawSpikes(spikeIndex);
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
            analyzeSpikes();
            if (counter >= T) {
                clearInterval(timer);
            }
            counter++;
        }, t);
    }
    else {
        clearInterval(timer);
        isCollectingSpikes = false;
        document.getElementById("buttonMLE").innerHTML = 'Start';
        deleteSpikes();
    }
}

//--- Main ---//
setStyles();
setVariables();
drawNetwork();
drawHead();