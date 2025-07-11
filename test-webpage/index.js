async function camera(){
    // Check if the browser supports the getUserMedia API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

// Create a video element to display the camera feed
    const video = document.createElement('video');
    video.autoplay = true; // Automatically play the video
    video.style.position = 'fixed';  
    video.playsInline = true; 
    video.style.top = '20px';
    video.style.left = '700px'; 
    video.style.width = '320px';
    video.style.height = '270px';
    video.style.transform = 'scaleX(-1)'; // Mirror the video horizontally
    video.style.zIndex = '1000'; // Ensure it appears above other content
 
    document.body.appendChild(video); // Append the video element to the body
        try {
        // Request access to the camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Get the video element
        video.srcObject = stream;
        // Play the video
        await video.play();
        return video; 
        } catch (error) {
        console.error('Error accessing the camera:', error);
        }
    } else {
     
     
        console.error('getUserMedia is not supported in this browser.');
    }
}


// load the MediaPipe Face Mesh model

async function loadmodel() {

    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;

    const detectorConfig = {
    runtime: 'mediapipe', 
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
    maxFaces: 1, // Maximum number of faces to detect
    refineLandmarks: true, // Whether to refine the landmarks
    }

    const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);    

  
     console.log("Model loaded successfully");
     return detector; 


    
}

// Start detecting the face in the video stream
//  canvas is implmented after this function dont be confused :)
async function continueDetection(video, detector,canvas) {
    const face = await detector.estimateFaces(video);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before drawing    

    if (face.length > 0) {
        console.log('Face detected:', face[0]);

        const keypoints = face[0].keypoints; // Get the keypoints of the detected face
// The model returns 478 (Keypoints) facial landmarks :
// - Left eye iris landmarks: indices 468 to 472 (5 points)
// - Right eye iris landmarks: indices 473 to 477 (5 points)
// we are using them to estimate iris center or gaze direction


// Iris centers: tells where the pupil is pionting
        const rightEyeIris = keypoints[474]; // Right eye iris center
        const leftEyeIris = keypoints[469]; // Left eye iris center

 // where eye is located, to measure if the eye is looking inward or outward aka left or right
        const leftEyeInnerCorner = keypoints[133]; 
        const leftEyeOuterCorner = keypoints[33];

        const rightEyeInnerCorner = keypoints[362]; 
        const rightEyeOuterCorner = keypoints[263];



        // Mirror drawing to match video
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);



        [leftEyeIris, rightEyeIris].forEach(iris => {
           
            
           ctx.beginPath();
           ctx.arc(iris.x, iris.y, 5,  0, 2 * Math.PI); // draw a circle around the iris center
           ctx.fillStyle = 'red'; 
           ctx.fill();
           ctx.closePath();
        }); ctx.restore();

        // Pc =Pl_corner + Pr_corner
        // Pl_corner and pr_corner stand for the located left eye inner corner and right eye inner corner
        const conrnerCenter ={
            x:(leftEyeInnerCorner.x + rightEyeInnerCorner.x )/2,
            y:(leftEyeInnerCorner.y + rightEyeInnerCorner.y )/2
        }

        //PI = Pl_iris + Pr_iris
        // Pl_iris and Pr_iris stand for the located left and right iris centers, respectively

        const irisCenter = {
            x: (leftEyeIris.x + rightEyeIris.x) / 2,
            y: (leftEyeIris.y + rightEyeIris.y) / 2
        };

        //Vg = PI -Pc
        // Vg is the gaze vector, which is the vector from the center of the eyes

        const gazeVector = {
            x: irisCenter.x - conrnerCenter.x,      
            y: irisCenter.y - conrnerCenter.y
        };

        // here we are going to normalize to remove scale dependency (gaze estimation will be independent of face size and zoom)
        // also to handle head movements, to make sure features are usable for mapping to screen coordinates
        //analogy: to know where someone is pionting according to thier hieght, a child vs an adult can piont in the same direction but at different heights
        
        // Vx = Vg.x /L -> L is the distnace between eye corners


        const L = calculateDistance(leftEyeInnerCorner, rightEyeInnerCorner); 
        const Vx = gazeVector.x / L; // Normalize the x component of the gaze vector

        // Vy = Vg.y /H -> H is the nose bridge height

        const noseBridge= keypoints[168];
        const nosetip = keypoints[2];

        const H = calculateDistance(noseBridge, nosetip); // Calculate the height of the nose bridge
        const Vy = gazeVector.y / H; // Normalize the y component of the gaze vector

      // THE FINAL NORMALIZED GAZE VECTOR///////////////

      const normalizedGazeVector = {
            x: Vx,  
            y: Vy
        }; console.log('Normalized Gaze Vector:', normalizedGazeVector);





    } else {
        console.log('No face detected');
    }
    requestAnimationFrame(() => continueDetection(video, detector,canvas)); // Call the function again for continuous detection
}


// Euclidean distnace
function calculateDistance(pointA, pointB) {

    return Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2));
}



// creating a canvas to draw the detected face landmarks
// to see what the model is detecting important for gaze interactions'
function createCanvas(video) {
    const canvas = document.createElement('canvas');

    // Wait until video is ready to get correct resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Match the video placement, but DO NOT scale canvas
    canvas.style.position = 'fixed';
    canvas.style.top = video.style.top;
    canvas.style.left = video.style.left;
    canvas.style.zIndex = '1001';
    canvas.style.pointerEvents = 'none';
    canvas.style.width = video.style.width;
    canvas.style.height = video.style.height;

    document.body.appendChild(canvas);
    return canvas;
 /////////// CANVAS NEEDS TO BE MORE ACCRUATE THAN THIS I GUESS BUT ITS ALMOST GOOD/////



}



    function createCursor() {
        const cursor = document.createElement('div');
        cursor.style.position = 'fixed';
        cursor.style.width = '10px';
        cursor.style.height = '10px';
        cursor.style.backgroundColor = 'red';
        cursor.style.borderRadius = '50%';
        cursor.style.pointerEvents = 'none'; // Prevent interaction with the cursor
        cursor.style.zIndex = '2000'; // Ensure it appears above other content
        document.body.appendChild(cursor);
        return cursor;
    }







async function main() {
    const video = await camera();
    if (!video) return;

    const canvas = createCanvas(video); 

    const detector = await loadmodel(); 
    if (!detector) return;
    continueDetection(video, detector, canvas); 

  
}




main();