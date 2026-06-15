const correctWord = "PRATH";

function checkGuess() {

    const guess = document
        .getElementById("guess")
        .value
        .toUpperCase();

    const message = document.getElementById("message");

    if (guess === correctWord) {
        message.innerText = "🎉 Correct!";
    } else {
        message.innerText =
            "Wrong bro. The answer is not " + guess;
    }
}