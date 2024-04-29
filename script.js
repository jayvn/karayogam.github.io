function revealMessage() {
    var secretMessage = document.getElementById('secretMessage');
    secretMessage.style.display = 'block'; // Show the secret message
    setTimeout(function() {
        document.body.classList.add('fade-out'); // Fade out the entire page
    }, 1000); // Page starts to fade out 5 seconds after revealing the secret message
    return false; // Prevent default link behavior
}

