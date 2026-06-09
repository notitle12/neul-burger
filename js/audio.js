// ==========================================
// 🎵 오디오 매니저 (Audio Manager - 세부 분리형)
// ==========================================

const bgmAudio = document.getElementById('background-bgm');
const sizzleAudio = document.getElementById('sizzle-sound');
const bellAudio = document.getElementById('bell-sound');
const squirtAudio = document.getElementById('squirt-sound');

// 각각 독립적으로 분리된 전역 사운드 세기 제어 변수
let bgmVolume = 0.1;
let sizzleVolume = 0.4;
let squirtVolume = 0.4;
let bellVolume = 0.4;

// 배경음악 오디오 락 해제 및 재생 함수
function playBackgroundBGM() {
    if (bgmAudio) {
        bgmAudio.volume = bgmVolume; 
        bgmAudio.play()
            .then(() => console.log("🎵 배경음악 재생 성공!"))
            .catch(error => console.error("🚨 오디오 락 해제 실패:", error));
    }
}

// 소스 짜는 효과음 함수 (독립 볼륨 연동)
function playSquirtSound() {
    if (squirtAudio) {
        squirtAudio.currentTime = 0; 
        squirtAudio.volume = squirtVolume;    
        squirtAudio.play().catch(err => console.log(err));
    }
}

// 서빙 벨 효과음 함수 (독립 볼륨 연동)
function playBellSound() {
    if (bellAudio) {
        bellAudio.currentTime = 0; 
        bellAudio.volume = bellVolume;    
        bellAudio.play().catch(e => console.log(e));
    }
}

// 철판 치이익 소리 제어 함수 (독립 볼륨 연동)
function handleSizzleSound(anyItemCooking) {
    if (!sizzleAudio) return;
    
    if (anyItemCooking) {
        if (sizzleAudio.paused) {
            sizzleAudio.volume = sizzleVolume; 
            sizzleAudio.play().catch(e => console.log(e));
        }
    } else {
        if (!sizzleAudio.paused) {
            sizzleAudio.pause();
            sizzleAudio.currentTime = 0; 
        }
    }
}

// ⚙️ UI 이벤트 및 슬라이더 개별 실시간 입력 감지 제어
document.addEventListener("DOMContentLoaded", () => {
    const settingsModal = document.getElementById("settings-modal");
    const openBtn = document.getElementById("settings-open-btn");
    const closeBtn = document.getElementById("settings-close-btn");

    // 슬라이더 및 텍스트 엘리먼트 캐싱
    const bgmSlider = document.getElementById("bgm-slider");
    const sizzleSlider = document.getElementById("sizzle-slider");
    const squirtSlider = document.getElementById("squirt-slider");
    const bellSlider = document.getElementById("bell-slider");

    const bgmTxt = document.getElementById("bgm-volume-txt");
    const sizzleTxt = document.getElementById("sizzle-volume-txt");
    const squirtTxt = document.getElementById("squirt-volume-txt");
    const bellTxt = document.getElementById("bell-volume-txt");

    // 팝업 열기 / 닫기
    if (openBtn && settingsModal) {
        openBtn.addEventListener("click", () => {
            settingsModal.classList.remove("modal-hidden");
        });
    }
    if (closeBtn && settingsModal) {
        closeBtn.addEventListener("click", () => {
            settingsModal.classList.add("modal-hidden");
        });
    }

    // 1) 배경음악 슬라이더
    if (bgmSlider) {
        bgmSlider.addEventListener("input", (e) => {
            bgmVolume = parseFloat(e.target.value);
            bgmTxt.innerText = Math.round(bgmVolume * 100) + "%";
            if (bgmAudio) bgmAudio.volume = bgmVolume;
        });
    }

    // 2) 철판 소리 슬라이더 (실시간 이미지 조리중일 때 사운드 즉시 반영)
    if (sizzleSlider) {
        sizzleSlider.addEventListener("input", (e) => {
            sizzleVolume = parseFloat(e.target.value);
            sizzleTxt.innerText = Math.round(sizzleVolume * 100) + "%";
            if (sizzleAudio && !sizzleAudio.paused) {
                sizzleAudio.volume = sizzleVolume;
            }
        });
    }

    // 3) 소스 효과음 슬라이더
    if (squirtSlider) {
        squirtSlider.addEventListener("input", (e) => {
            squirtVolume = parseFloat(e.target.value);
            squirtTxt.innerText = Math.round(squirtVolume * 100) + "%";
        });
    }

    // 4) 서빙 벨 슬라이더
    if (bellSlider) {
        bellSlider.addEventListener("input", (e) => {
            bellVolume = parseFloat(e.target.value);
            bellTxt.innerText = Math.round(bellVolume * 100) + "%";
        });
    }
});