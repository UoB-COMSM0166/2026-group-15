function setup() {
  createCanvas(600, 400);
  // Set the background to white
  background(255);
  // Set text colour and size
  fill(122, 100, 200);
  textSize(20);
  text("simple paint\nclick to draw and press 'c' to clear", 20, 30);
}

function draw() {
  if (mouseIsPressed) {
    // Set the colourful spraybrush
    stroke(random(100, 255), random(100, 255), random(100, 255));
    for (n = 0; n < 5; n++) {
      ellipse(
        mouseX + random(-5, 5),
        mouseY + random(-5, 5),
        1 + random(2),
        1 + random(2)
      );
    }
  }
}

function keyPressed() {
  if (key === "c") {
    background(255);
    fill(122, 100, 200);
    textSize(20);
    text("simple paint\nclick to draw and press 'c' to clear", 20, 30);
  }
}
