// ==========================================
// 🎵 오디오 매니저 (Audio Manager)
// ==========================================

const bgmAudio = document.getElementById('background-bgm');
const sizzleAudio = document.getElementById('sizzle-sound');
const bellAudio = document.getElementById('bell-sound');
const squirtAudio = document.getElementById('squirt-sound');

// 배경음악 오디오 락 해제 및 재생 함수
function playBackgroundBGM() {
    if (bgmAudio) {
        bgmAudio.volume = 0.5; 
        bgmAudio.play()
            .then(() => console.log("🎵 배경음악 재생 성공!"))
            .catch(error => console.error("🚨 오디오 락 해제 실패:", error));
    }
}

// 소스 짜는 효과음 함수
function playSquirtSound() {
    if (squirtAudio) {
        squirtAudio.currentTime = 0; 
        squirtAudio.volume = 0.5;    
        squirtAudio.play().catch(err => console.log(err));
    }
}

// 서빙 벨 효과음 함수
function playBellSound() {
    if (bellAudio) {
        bellAudio.currentTime = 0; 
        bellAudio.volume = 1;    
        bellAudio.play().catch(e => console.log(e));
    }
}

// 철판 치이익 소리 제어 함수 (실시간 루프용)
function handleSizzleSound(anyItemCooking) {
    if (!sizzleAudio) return;
    
    if (anyItemCooking) {
        if (sizzleAudio.paused) {
            sizzleAudio.volume = 0.3; 
            sizzleAudio.play().catch(e => console.log(e));
        }
    } else {
        if (!sizzleAudio.paused) {
            sizzleAudio.pause();
            sizzleAudio.currentTime = 0; 
        }
    }
}