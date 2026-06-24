const q1=document.querySelector(".q_1");
const q2=document.querySelector(".q_2");
const buttonContinue=document.querySelector(".continue");
const Nobutton=document.querySelector('.No');
const Yesbutton=document.querySelector('.Yes');
const Noblock=document.querySelector('.Noblock');
const Againbutton=document.querySelector('.try');
const afterq=document.querySelector('.afterq');
const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const match = document.querySelector(".match");
const cakeArea = document.querySelector(".cake-area");
const cakeImg = document.querySelector(".cake");
const letterblock=document.querySelector('.letter');
const letteryesbtn=document.querySelector('.letyes');
const openlet=document.querySelector('.close');
const finallet=document.querySelector('.openlet');
const congratulationsDiv = document.querySelector('.congratulations'); 
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const WEBCAM_WIDTH = isMobile ? 240 : 300;
const WEBCAM_HEIGHT = isMobile ? 180 : 225;
const BLOW_THRESHOLD = 60;
const LIGHT_DISTANCE = 50;

canvas.width = WEBCAM_WIDTH;
canvas.height = WEBCAM_HEIGHT;

let handPosition = { x: 0.5, y: 0.5 };
let isHandDetected = false;
let isCakeLit = false;
let isCandlesBlownOut = false;

let audioContext = null;
let analyser = null;
let microphone = null;
let isBlowDetectionActive = false;
const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  },
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: isMobile ? 0 : 1,
  minDetectionConfidence: isMobile ? 0.6 : 0.7,
  minTrackingConfidence: isMobile ? 0.4 : 0.5,
});

hands.onResults((results) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    isHandDetected = true;

    const indexTip = landmarks[8];

    handPosition.x = 1 - indexTip.x;
    handPosition.y = indexTip.y;

    updateMatchPosition();
    checkCandleLighting();
  } else {
    isHandDetected = false;
  }
});

function updateMatchPosition() {
  if (!isHandDetected) return;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const matchX = handPosition.x * windowWidth;
  const matchY = handPosition.y * windowHeight;
  const matchWidth = match.offsetWidth || 80; 
  const matchHeight = match.offsetHeight || 120; 
  
  match.style.left = `${matchX - matchWidth/2}px`;
  match.style.top = `${matchY - matchHeight}px`; 
}
function checkCandleLighting() {
  if (isCakeLit || isCandlesBlownOut) return;

  const matchRect = match.getBoundingClientRect();
  const cakeRect = cakeImg.getBoundingClientRect();
  const matchTipX = matchRect.left + matchRect.width / 2;
  const matchTipY = matchRect.top;
  const candleX = cakeRect.left + cakeRect.width / 2;
  const candleY = cakeRect.top + (cakeRect.height * 0.4); 

  const distance = Math.sqrt(
    Math.pow(matchTipX - candleX, 2) + Math.pow(matchTipY - candleY, 2)
  );

  console.log(`Distance to candle: ${distance}px`); 

  if (distance < LIGHT_DISTANCE) {
    lightCake();
  }
}

function lightCake() {
  if (isCakeLit) return;

  isCakeLit = true;
  cakeImg.src = "cake_lit.gif";
  match.style.display = "none";
  
  if (!isBlowDetectionActive) {
    initBlowDetection();
  }
}

function blowOutCandles() {
  if (!isCakeLit || isCandlesBlownOut) return;

  isCandlesBlownOut = true;
  cakeImg.src = "cake_unlit.gif";
  
  showCelebrationMessage();
}

function showCelebrationMessage() {
  const message = document.createElement('div');
  message.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 15px;
      border: 4px solid #5d84c1;
      text-align: center;
      z-index: 1000;
      width: 300px;
      max-width: 90%;
    ">
      <h2 style="
        font-family: 'Playpen Sans';
        color: #5376ae;
        font-size: 28px;
        margin-bottom: 15px;
      ">🎉 Happy Birthday! 🎉</h2>
      <p style="
        font-family: 'Playpen Sans';
        color: #5376ae;
        font-size: 16px;
        margin-bottom: 20px;
      ">You successfully blew out the candles!</p>
      <button id="closeCelebration" style="
        width: 100px;
        height: 30px;
        border-radius: 10px;
        background-color: #5d84c1;
        color: white;
        border: 2px solid #5d84c1;
        font-family: 'Playpen Sans';
        cursor: pointer;
      ">OK</button>
    </div>
  `;
  
  document.body.appendChild(message);
  
  document.getElementById('closeCelebration').addEventListener('click', function() {
    message.remove();
    afterq.style.display='none';
    letterblock.style.display='block';
  });
}

async function initBlowDetection() {
  try {
    if (!cameraStream) {
      console.log("No camera stream available");
      return;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    
    const audioTrack = cameraStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.log("No audio track available");
      return;
    }
    
    const audioStream = new MediaStream([audioTrack]);
    microphone = audioContext.createMediaStreamSource(audioStream);

    analyser.fftSize = 256;
    microphone.connect(analyser);

    isBlowDetectionActive = true;

    detectBlow();
  } catch (err) {
    console.error("Error accessing microphone:", err);
    if (!isMobile) {
      alert("Microphone access is needed to blow out the candles. Please allow microphone permissions.");
    }
  }
}

function detectBlow() {
  if (!isBlowDetectionActive) return;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

  if (volume > BLOW_THRESHOLD && isCakeLit && !isCandlesBlownOut) {
    blowOutCandles();
  }

  requestAnimationFrame(detectBlow);
}
async function initCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: WEBCAM_WIDTH,
        height: WEBCAM_HEIGHT,
        facingMode: "user",
      },
      audio: true 
    });

    video.srcObject = cameraStream;

    video.onloadedmetadata = () => {
      video.play();
      startHandTracking();
      if (isCakeLit && !isBlowDetectionActive) {
        initBlowDetection();
      }
    };

  } catch (err) {
    console.error("Error accessing media devices:", err);
    showMediaError(err);
  }
}

function startHandTracking() {
  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: WEBCAM_WIDTH,
    height: WEBCAM_HEIGHT,
  });

  camera.start();
}

function createInstructions() {
    const instructions = document.createElement('div');
    instructions.className = 'instructions';
    instructions.innerHTML = `
      <div style="
        position:fixed;
        text-align: center;
        font-family: 'Playpen Sans';
        color: #5376ae;
        font-size: 16px;
        margin: 20px auto;
        left:50%;
        transform:translateX(-50%);
        padding: 10px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 10px;
        max-width: 50%;
        z-index:100;
      ">
        <strong>Instructions:</strong><br>
        1. Move your finger to light the candles<br>
        2. Blow into the microphone to blow them out!
      </div>
    `;
    return instructions;
}
buttonContinue.addEventListener('click', function(){
    q1.style.display='none';
    q2.style.display='block';
});

Nobutton.addEventListener('click', function(){
    q2.style.display='none';
    Noblock.style.display='block';
});

Againbutton.addEventListener('click', function(){
    Noblock.style.display='none';
    q2.style.display='block';
});

Yesbutton.addEventListener('click', function(){
    q2.style.display='none';
    afterq.style.display='block';
    if (!document.querySelector('.instructions')) {
        const instructions = createInstructions();
        afterq.insertBefore(instructions, afterq.firstChild);
    }
    initCamera();
    if (isMobile) {
      document.body.addEventListener(
        "click",
        () => {
          if (!audioContext && isCakeLit) {
            initBlowDetection();
          }
        },
        { once: true }
      );
    }
    
});
letteryesbtn.addEventListener('click',function(){
    letterblock.style.display='none';
    openlet.style.display='block';
    openlet.style.position = 'fixed';
    openlet.style.left = '50%';
    openlet.style.top = '50%';
    openlet.style.transform = 'translate(-50%, -50%)';
    openlet.style.zIndex = '1500';
    
    openlet.style.animation = 'openLetter 0.8s forwards';
    setTimeout(() => {
        showCongratulations();
    }, 1500); 
});

function showCongratulations() {
    openlet.style.display = 'none';
    
    congratulationsDiv.style.display = 'flex';
    congratulationsDiv.style.animation = 'fadeInUp 0.8s ease-out';
    const congratsContent = document.querySelector('.congrats-content');
    if (congratsContent) {
        congratsContent.scrollTop = 0;
    }
}

if (openlet) {
    openlet.addEventListener('click', function() {
        if (openlet.style.display === 'block') {
            showCongratulations();
        }
    });
}
