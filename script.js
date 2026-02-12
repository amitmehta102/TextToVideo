const apiKey = 'YOUR_RUNWAY_API_KEY';  // Replace with your Runway ML API key
const apiUrl = 'https://api.runwayml.com/v1/image_to_video';  // Or text-to-video endpoint if available; adjust as needed

document.getElementById('generateBtn').addEventListener('click', async () => {
    const text = document.getElementById('textInput').value.trim();
    if (!text) {
        alert('Please enter some text.');
        return;
    }

    const statusDiv = document.getElementById('status');
    const videoPlayer = document.getElementById('videoPlayer');
    statusDiv.textContent = 'Generating video... This may take a few minutes.';
    videoPlayer.style.display = 'none';

    try {
        // Step 1: Submit the text as a prompt (Runway expects an image + prompt; for simplicity, assume text-to-video)
        // Note: Runway's API might require an initial image. For pure text-to-video, you might need a different service like Pika Labs.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gen-3-alpha-turbo',  // Example model; check Runway docs
                prompt: text,  // Treat text as prompt
                // Add other params like duration, etc., as per API
            })
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const taskId = data.id;  // Assume API returns a task ID

        // Step 2: Poll for completion
        const pollInterval = setInterval(async () => {
            const pollResponse = await fetch(`${apiUrl}/${taskId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const pollData = await pollResponse.json();

            if (pollData.status === 'COMPLETE') {
                clearInterval(pollInterval);
                statusDiv.textContent = 'Video ready!';
                videoPlayer.src = pollData.output[0];  // Assume output URL
                videoPlayer.style.display = 'block';
            } else if (pollData.status === 'FAILED') {
                clearInterval(pollInterval);
                statusDiv.textContent = 'Video generation failed. Try again.';
            }
        }, 10000);  // Poll every 10 seconds

    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
    }
});
