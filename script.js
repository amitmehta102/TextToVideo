const API_KEY = "nHuHETmeb3RTCi7vZmhwN5s9ztSBoSBRv3R4Zt4cDKnBeH2NJWtLQwK5";

const canvas = document.getElementById("videoCanvas");
const ctx = canvas.getContext("2d");

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");


let recordedBlob = null;
let isPaused = false;

generateBtn.addEventListener("click", generateVideo);

// Pause / Resume on canvas click
canvas.addEventListener("click", () => {
    isPaused = !isPaused;

    if (isPaused) {
        speechSynthesis.pause();
    } else {
        speechSynthesis.resume();
    }
});

function splitText(text) {
    return text.split(/[.!?]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

function extractKeyword(sentence) {
    const stopWords = ["the","a","an","and","is","are","was","were",
        "to","of","in","on","with","at","by","for","he","she","it","they"];

    const words = sentence.toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .split(" ");

    const filtered = words.filter(word =>
        word.length > 3 && !stopWords.includes(word)
    );

    return filtered.length ? filtered[0] : "nature";
}

async function fetchVideo(keyword) {

    const response = await fetch(
        `https://api.pexels.com/videos/search?query=${keyword}&per_page=1&orientation=landscape`,
        { headers: { Authorization: API_KEY } }
    );

    const data = await response.json();
    if (!data.videos.length) return null;

    return data.videos[0].video_files[0].link;
}

function speakText(text) {
    speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1.2;
    speech.pitch = 1;
    speechSynthesis.speak(speech);
}

async function generateVideo() {

    generateBtn.disabled = true;
    downloadBtn.disabled = true;

    const text = document.getElementById("textInput").value;
    const scenes = splitText(text);

    if (!scenes.length) {
        generateBtn.disabled = false;
        return;
    }

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);

    recorder.onstop = () => {
        recordedBlob = new Blob(chunks, { type: "video/webm" });
        downloadBtn.disabled = false;
        generateBtn.disabled = false;
    };

    recorder.start();

    // Pre-fetch videos
    const videoUrls = [];
    for (let scene of scenes) {
        const keyword = extractKeyword(scene);
        const videoUrl = await fetchVideo(keyword);
        videoUrls.push(videoUrl);
    }

    // Play scenes continuously
    for (let i = 0; i < scenes.length; i++) {

        if (videoUrls[i]) {
            await playScene(videoUrls[i], scenes[i]);
        }
    }

    recorder.stop();
}


function loadVideo(src) {
    return new Promise(resolve => {
        const video = document.createElement("video");
        video.src = src;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.onloadeddata = () => resolve(video);
    });
}

async function playScene(videoSrc, text) {

    const video = await loadVideo(videoSrc);
    video.play();

    speakText(text);

    const duration = 1800;  // slightly faster
    const start = performance.now();

    return new Promise(resolve => {

        function animate(now) {

            if (isPaused) {
                requestAnimationFrame(animate);
                return;
            }

            const elapsed = now - start;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "white";
            ctx.font = "36px Segoe UI";
            ctx.textAlign = "center";

            wrapText(text, canvas.width / 2, canvas.height / 2, 800, 45);

            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                video.pause();
                resolve();  // immediately continue
            }
        }

        requestAnimationFrame(animate);
    });
}


function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let lines = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + " ";
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, y + (i * lineHeight));
    }
}

downloadBtn.addEventListener("click", () => {

    if (!recordedBlob) return;

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cinematic_video.webm";
    a.click();
});
