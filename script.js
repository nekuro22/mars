document.addEventListener("DOMContentLoaded", function() {
    const btn = document.getElementById("btn");
    

    btn.addEventListener("click", function() {
        alert("Button Clicked");
    });
    window.addEventListener("click", function() {
        alert("Window Clicked");
    });
});


import { add } from "./math.js";
console.log(add(2, 3));
console.log(add(5, 10));


