// ==========================================
// 1. 전역 게임 상태 데이터
// ==========================================
let score = 0;              
let timeLeft = 1200;        
let gameInterval = null;    
let reactionTimeout = null; 

let mouseHolding = {
    type: null,        
    status: null,       // 기존 채점용 데이터 무결성 유지
    displayStatus: null // 🥩 마우스 포인터 및 빵봉지 레이어에 렌더링할 '뒷면 고기 상태' 전용 변수
};

let grillZones = [
    { id: 0, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0, frontStatus: 'none' },
    { id: 1, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0, frontStatus: 'none' },
    { id: 2, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0, frontStatus: 'none' },
    { id: 3, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0, frontStatus: 'none' }
];

let burgerBags = [
    { id: 0, stack: [], isPacked: false },
    { id: 1, stack: [], isPacked: false },
    { id: 2, stack: [], isPacked: false },
    { id: 3, stack: [], isPacked: false }
];

// ==========================================
// 2. DOM 요소 캐싱 (★누락되었던 상단 변수들 완전 복구)
// ==========================================
const container = document.getElementById('game-container');
const timerEl = document.getElementById('time-val');
const scoreEl = document.getElementById('score-val');
const bellBtn = document.getElementById('serve-bell-btn');
const follower = document.getElementById('mouse-follower');
const grillEls = document.querySelectorAll('.grill-zone');
const bagEls = document.querySelectorAll('.bag-zone');
const trayItems = document.querySelectorAll('.tray-item');

const reactionContainer = document.getElementById('reaction-container');
const reactionImg = document.getElementById('reaction-img');

// ==========================================
// 3. 게임 엔진 초기화 (수정 반영본)
// ==========================================
function init() {
    window.addEventListener('contextmenu', e => e.preventDefault());

    // 💡 [추가된 부분] 초기 실행 시 점수판 영역을 공백 대신 '0원' 포맷으로 통일시킵니다.
    if (scoreEl) scoreEl.innerText = score + "원";

    // 💡 브라우저 오디오 자동재생 정책(Autoplay) 우회 안전 장치
    const unlockAndPlayBGM = () => {
        playBackgroundBGM();
        // 한 번 재생에 성공하면 이벤트 리스너를 제거하여 중복 실행 방지
        window.removeEventListener('click', unlockAndPlayBGM);
        window.removeEventListener('mousedown', unlockAndPlayBGM);
    };

    // 사용자가 인게임 화면에서 무언가를 누르는 첫 순간 BGM 시동
    window.addEventListener('click', unlockAndPlayBGM);
    window.addEventListener('mousedown', unlockAndPlayBGM);

    container.addEventListener('click', (e) => {
        if (!e.target.closest('.tray-item') && !e.target.closest('.grill-zone') && !e.target.closest('.bag-zone') && !e.target.closest('#serve-bell-btn')) {
            clearMouseHolding();
        }
    });

    container.addEventListener('mousemove', (e) => {
        if (mouseHolding.type) {
            const rect = container.getBoundingClientRect();
            follower.style.left = (e.clientX - rect.left) + 'px';
            follower.style.top = (e.clientY - rect.top) + 'px';
        }
    });

    // 게임 시작 시 즉시 핸들러와 타이머 루프 가동
    setupEvents();
    startGameLoop();
}
// ==========================================
// 4. 이벤트 핸들러 등록
// ==========================================
function setupEvents() {
    trayItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = item.getAttribute('data-type');
            mouseHolding.type = type;
            mouseHolding.status = (type === 'patty' || type === 'onion') ? 'raw' : 'normal';
            mouseHolding.displayStatus = (type === 'patty' || type === 'onion') ? 'raw' : 'normal'; 
            updateFollower(e); 
        });
    });

    grillEls.forEach(zoneEl => {
        zoneEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(zoneEl.getAttribute('data-id'));
            const zone = grillZones[id];

            // 1️⃣ 철판이 비어있을 때
            if (!zone.isOccupied) {
                // 🛑 재조리 불가 규칙: 고기와 양파 모두 마우스 상태가 완벽한 생것('raw')일 때만 투입 허용!
                if ((mouseHolding.type === 'onion' || mouseHolding.type === 'patty') && mouseHolding.status === 'raw') {
                    zone.isOccupied = true;
                    zone.type = mouseHolding.type;
                    zone.time = 0;
                    zone.sideTime = 0;
                    zone.isFlipped = false;
                    zone.status = 'raw';
                    zone.frontStatus = 'none'; 
                    
                    // 💡 구역 전체가 아니라 내부 .ingredient-img에 이미지를 넣습니다.
                    const imgEl = zoneEl.querySelector('.ingredient-img');
                    if (imgEl) imgEl.style.backgroundImage = `url('${assetImages[zone.type + '_raw']}')`;
                    
                    clearMouseHolding();
                }
            } 
            // 2️⃣ 철판에 재료가 구워지고 있을 때
            else {
                const isHandEmpty = !mouseHolding.type;
                const isHoldingSource = (mouseHolding.type === 'source1' || mouseHolding.type === 'source2');

                if (isHandEmpty || isHoldingSource) {
                    
                    // 🥩 [패티 뒤집기 기믹]
                    if (zone.type === 'patty' && !zone.isFlipped && zone.status !== 'burned') {
                        if (zone.sideTime < 3) {
                            zone.frontStatus = 'raw';
                        } else if (zone.sideTime >= 3 && zone.sideTime <= 4) {
                            zone.frontStatus = 'cooked'; 
                        } else {
                            zone.frontStatus = 'burned'; 
                        }

                        zone.isFlipped = true;
                        zone.sideTime = 0; 
                        
                        if (zone.frontStatus === 'burned') {
                            zone.status = 'burned';
                        } else {
                            zone.status = 'raw'; 
                        }
                        zoneEl.style.borderStyle = 'solid'; 
                        zoneEl.style.borderColor = '#8b5a2b';
                    } 
                    // 🧺 [스마트 즉시 수거 시스템] 패티 수거 및 양파 즉시 수거
                    else {
                        if (isHoldingSource) {
                            clearMouseHolding(); 
                        }

                        mouseHolding.type = zone.type;
                        
                        if (zone.type === 'patty') {
                            let backStatus = 'raw';
                            if (zone.isFlipped) {
                                if (zone.sideTime >= 3 && zone.sideTime <= 4) {
                                    backStatus = 'cooked'; 
                                } else if (zone.sideTime > 4) {
                                    backStatus = 'burned'; 
                                }
                            }

                            if (zone.frontStatus === 'burned' || zone.status === 'burned' || backStatus === 'burned') {
                                mouseHolding.status = 'burned'; 
                                mouseHolding.displayStatus = 'burned'; 
                            } else {
                                mouseHolding.status = `${zone.frontStatus}_${backStatus}`;
                                mouseHolding.displayStatus = backStatus;
                            }
                        } else {
                            // 양파 재사용 원천 차단: 완벽히 익기 전인 'raw' 상태의 양파를 도중에 수거했다면 'raw_half'로 변경
                            if (zone.status === 'raw') {
                                mouseHolding.status = 'raw_half';
                            } else {
                                mouseHolding.status = zone.status;
                            }
                            mouseHolding.displayStatus = zone.status;
                        }
                        
                        // 철판 리셋
                        zone.isOccupied = false;
                        zone.type = null;
                        zone.status = 'none';
                        zone.frontStatus = 'none';
                        zone.time = 0;
                        zone.sideTime = 0;
                        zone.isFlipped = false;
                        elReset(zoneEl, id);
                        updateFollower(e); 
                    }
                }
            }
        });
    });

bagEls.forEach(bagEl => {
    bagEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(bagEl.getAttribute('data-id'));
        const bag = burgerBags[id];

        if (bag.isPacked) return;

        if (mouseHolding.type) {
            // ... (기존 재료 쌓는 코드 유지) ...
            let layerName = mouseHolding.type;
            if (mouseHolding.type === 'patty') {
                layerName += `_${mouseHolding.status}_${mouseHolding.displayStatus}`;
            } else if (mouseHolding.type === 'onion') {
                layerName += `_${mouseHolding.status}`;
            }
            
            if (mouseHolding.type === 'source1' || mouseHolding.type === 'source2') {
                playSquirtSound();
                const topItem = bag.stack.length > 0 ? bag.stack[bag.stack.length - 1] : "";
                if (topItem.startsWith(mouseHolding.type)) {
                    const currentCount = parseInt(topItem.split('_')[1]);
                    if (currentCount < 3) {
                        bag.stack[bag.stack.length - 1] = `${mouseHolding.type}_${currentCount + 1}`;
                        renderBagStack(id);
                        return; 
                    } else { return; }
                } else { layerName += `_1`; }
            }

            bag.stack.push(layerName);
            renderBagStack(id);

            if (mouseHolding.type !== 'source1' && mouseHolding.type !== 'source2') {
                clearMouseHolding();
            }
        } else {
            // 💡 [수정]: 빈 손으로 클릭하여 포장을 완료했을 때의 처리
            if (bag.stack.length > 0) {
                bag.isPacked = true;
                bagEl.classList.add('packed'); // 클래스를 추가하여 CSS에서 밀봉 이미지가 보이게 합니다.
                
                // 💡 [추가]: 포장이 완료되었으므로 쌓여있던 햄버거 레이어들을 화면에서 싹 지워줍니다.
                const stackArea = bagEl.querySelector('.burger-stack');
                if (stackArea) stackArea.innerHTML = '';
            }
        }
    });
});

bellBtn.addEventListener('click', () => {
        playBellSound();

        let hasPackedBurger = false; 
        let isPerfectSubmit = true;  
        let isJangnanAny = false; 
        let earnedMoneyTotal = 0; 

        const dialogueBox = document.getElementById('dialogue-box');
        dialogueBox.className = ''; 
        dialogueBox.innerText = '';

        burgerBags.forEach((bag, index) => {
            if (bag.isPacked) { // 💡 포장 완료된 버거만 정산하는 규칙 유지
                hasPackedBurger = true;

                let bunCount = 0;
                let pattyCount = 0;
                bag.stack.forEach(item => {
                    if (item.startsWith('bun')) bunCount++;
                    if (item.startsWith('patty')) pattyCount++;
                });

                let earnedMoney = 0;
                let isCurrentJangnan = false;

                if (bunCount < 2 || pattyCount < 1) {
                    earnedMoney = 0;
                    isCurrentJangnan = true;
                    isJangnanAny = true; 
                    isPerfectSubmit = false;
                } else {
                    earnedMoney = calculateBurgerPrice(bag.stack);
                    
                    if (earnedMoney <= 6000) {
                        earnedMoney = 0;
                        isPerfectSubmit = false; 
                    }
                    else if (earnedMoney > 0 && earnedMoney < 10000) {
                        isPerfectSubmit = false; 
                    }
                }

                score += earnedMoney;
                earnedMoneyTotal += earnedMoney; 
                bag.stack = [];
                bag.isPacked = false;
                
                const bagEl = bagEls[index];
                bagEl.classList.remove('packed'); // 포장 완료 불빛 해제
                
                // ✂️ 빵봉지 글자(장난 금지!, 맛없어서 0원!)를 넣던 코드를 지우고 안정적으로 렌더링만 호출합니다.
                renderBagStack(index);
            }
        });
        
        scoreEl.innerText = score + "원";

        // ==========================================
        // 🎬 캐릭터 리액션 연출 및 애니메이션 타이머
        // ==========================================
        if (hasPackedBurger) {
            if (reactionTimeout) clearTimeout(reactionTimeout); 

            if (isJangnanAny) {
                reactionImg.src = 'images/clear_fail.webp'; 
                dialogueBox.className = 'bubble-bad';
                dialogueBox.innerText = "지금 장난해?!";
            }
            else if (earnedMoneyTotal === 0) {
                reactionImg.src = 'images/clear_fail.webp'; 
                dialogueBox.className = 'bubble-bad';
                dialogueBox.innerText = "이딴 걸 먹으라고 준 거야?!";
            }
            else if (isPerfectSubmit) {
                reactionImg.src = 'images/clear_perfect.webp'; 
                dialogueBox.className = 'bubble-good';
                dialogueBox.innerText = "이거지! 야르~";
            }
            else {
                reactionImg.src = 'images/clear_soso.webp'; 
                dialogueBox.className = 'bubble-good'; 
                dialogueBox.innerText = "쩝쩝쩝 먹을만하네"; 
            }

            reactionContainer.classList.remove('reaction-hidden');

            reactionTimeout = setTimeout(() => {
                // 💡 [버거 해결 핵심 키] 타이머 종료 시 글자를 초기화하려던 잔재를 삭제했습니다.
                // 에러가 차단되어 캐릭터 숨김(reaction-hidden) 애니메이션이 정상적으로 실행됩니다!
                reactionContainer.classList.add('reaction-hidden');
                dialogueBox.className = '';
                dialogueBox.innerText = '';
            }, 1200); 
        }
    });
}

// ==========================================
// 5. 정산 채점 시스템 (constants.js의 정적 데이터를 기반으로 작동)
// ==========================================
function calculateBurgerPrice(userStack) {
    let price = 10000; 
    
    const requiredCategories = ['bun', 'source1', 'source2', 'cheeze', 'patty', 'onion'];
    requiredCategories.forEach(category => {
        const hasIngredient = userStack.some(item => item.startsWith(category));
        if (!hasIngredient) price -= 1000;
    });

    userStack.forEach(item => {
        if (item.startsWith('source1_1') || item.startsWith('source1_3')) price -= 500;
        if (item.startsWith('source2_1') || item.startsWith('source2_3')) price -= 500;
        
        if (item.startsWith('onion_burned')) price -= 500;
        if (item.startsWith('onion_raw')) price -= 500;
        if (item.startsWith('onion_raw_half')) price -= 500; 
    });

    userStack.forEach(item => {
        if (item.startsWith('patty_')) {
            const pattyType = item.replace('patty_', ''); 
            
            const parts = pattyType.split('_');
            let finalPattyKey = pattyType;
            if (parts.length >= 3) {
                finalPattyKey = `${parts[0]}_${parts[1]}`;
            }

            switch(finalPattyKey) {
                case 'raw_raw':     price -= 1000;  break;
                case 'raw_cooked':  price -= 1000;  break;
                case 'raw_burned':  price -= 1000;  break;
                case 'cooked_raw':  price -= 1000;  break;
                case 'cooked_cooked': break;
                case 'cooked_burned': price -= 1000;  break;
                case 'burned':      price -= 2000;  break;
            }
        }
    });

    let isOrderPerfect = true;
    if (userStack.length !== targetRecipe.length) {
        isOrderPerfect = false;
    } else {
        for (let i = 0; i < targetRecipe.length; i++) {
            let userLayer = userStack[i];
            if (userLayer.startsWith('patty_')) {
                const p = userLayer.split('_');
                if (p.length >= 4) userLayer = `${p[0]}_${p[1]}_${p[2]}`;
            }
            if (userLayer !== targetRecipe[i]) {
                isOrderPerfect = false;
                break;
            }
        }
    }
    if (!isOrderPerfect) price -= 500;

    return Math.max(0, price);
}

// ==========================================
// 6. 시스템 유틸리티 함수
// ==========================================
function clearMouseHolding() {
    mouseHolding.type = null;
    mouseHolding.status = null;
    mouseHolding.displayStatus = null;
    follower.style.display = 'none';
    follower.style.backgroundImage = 'none';
}

function updateFollower(e) {
    if (mouseHolding.type) {
        follower.style.display = 'block';
        let imagePath = "";

        if (mouseHolding.type === "source1") {
            imagePath = "images/red_source.webp";      
        }
        else if (mouseHolding.type === "source2") {
            imagePath = "images/white_source.webp";
        }
        else {
            let key = mouseHolding.type;

            if (mouseHolding.type === "patty") {
                key += `_${mouseHolding.displayStatus}`;
            } else if (mouseHolding.type === "onion") {
                const shortStatus = mouseHolding.status === 'raw_half' ? 'raw' : mouseHolding.status.split('_')[0];
                key += `_${shortStatus}`;
            }

            imagePath = assetImages[key] || assetImages[mouseHolding.type];
        }

        follower.style.backgroundImage = `url('${imagePath}')`;
        
        if (mouseHolding.type === "source1" || mouseHolding.type === "source2") {
            follower.style.transform = "translate(-20px,-45px) rotate(-135deg)";
        }
        else {
            follower.style.transform = "translate(-27px,-27px)";
        }

        if (e) {
            const rect = container.getBoundingClientRect();
            follower.style.left = (e.clientX - rect.left) + 'px';
            follower.style.top = (e.clientY - rect.top) + 'px';
        }
    }
}

function elReset(zoneEl, id) {
    const imgEl = zoneEl.querySelector('.ingredient-img');
    if (imgEl) imgEl.style.backgroundImage = 'none';
    // ✂️ statusSpan 관련 코드 완전 삭제
}

// ==========================================
// 🍔 7. 조합형 렌더링 함수
// ==========================================
function renderBagStack(bagId) {
    const bagEl = bagEls[bagId];
    const stackArea = bagEl.querySelector('.burger-stack');
    stackArea.innerHTML = ''; 
    
    // 💡 [추가]: 만약 포장이 이미 완료된 상태라면 재료 레이어들을 그리지 않고 리턴합니다.
    if (burgerBags[bagId].isPacked) {
        return;
    }

    let currentBottom = 60; 

    burgerBags[bagId].stack.forEach((layer, index) => {
        // ... (기존 햄버格 레이어 쌓는 코드 그대로 유지) ...
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer';
        const parts = layer.split('_');
        const rawType = parts[0]; 
        let imgKey = layer;
        let currentKey = rawType;

        if (rawType === 'bun') {
            let hasPreviousBun = false;
            for (let i = 0; i < index; i++) {
                if (burgerBags[bagId].stack[i].startsWith('bun')) { hasPreviousBun = true; break; }
            }
            if (hasPreviousBun) {
                imgKey = 'bun_top'; currentKey = 'bun_top'; layerDiv.classList.add('layer-bun-top');
            } else {
                imgKey = 'bun_bottom'; currentKey = 'bun_bottom'; layerDiv.classList.add('layer-bun-bottom');
            }
        } else if (rawType === 'source1' || rawType === 'source2') {
            currentKey = rawType; layerDiv.classList.add('layer-source');
        } else if (rawType === 'patty') {
            layerDiv.classList.add(`layer-${rawType}`);
            const backStatus = parts[3] || parts[1]; imgKey = `patty_${backStatus}`; 
        } else if (rawType === 'onion') {
            layerDiv.classList.add(`layer-${rawType}`);
            if (parts[1] === 'raw' && parts[2] === 'half') { imgKey = 'onion_raw'; }
        } else { layerDiv.classList.add(`layer-${rawType}`); }

        if (index > 0) {
            const previousLayer = burgerBags[bagId].stack[index - 1];
            const prevType = previousLayer.split('_')[0]; 
            let prevKey = previousLayer; 
            if (prevType === 'bun' && index - 1 === 0) { prevKey = 'bun_bottom'; } 
            else if (prevType === 'source1' || prevType === 'source2') { prevKey = prevType; }

            let comboName = `${prevKey}_${currentKey}`;
            let gap = 0;
            if (combinationGaps[comboName] !== undefined) { gap = combinationGaps[comboName]; } 
            else {
                const fallbackKey = `${prevType}_${currentKey}`;
                if (combinationGaps[fallbackKey] !== undefined) { gap = combinationGaps[fallbackKey]; } 
                else {
                    const prevThick = defaultThickness[prevKey] !== undefined ? defaultThickness[prevKey] : 4;
                    gap = prevThick + 4; 
                }
            }
            currentBottom += gap;
        }

        layerDiv.style.bottom = currentBottom + 'px';
        layerDiv.style.zIndex = index + 1; 
        layerDiv.innerText = parts[0] + (parts[1] ? `_${parts[1]}` : '');
        layerDiv.style.backgroundImage = `url('${assetImages[imgKey] || assetImages[rawType]}')`;
        stackArea.appendChild(layerDiv);
    });
}

// ==========================================
// 8. 실시간 조리 타이머 루프 Engine (수정본)
// ==========================================
function startGameLoop() {
    gameInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = Math.ceil(timeLeft / 10);

        // 💡 [수정] 제한시간이 끝났을 때 결과창으로 이동
        if (timeLeft <= 0) {
            clearInterval(gameInterval);
            
            // 📢 알림창을 띄우고 확인을 누르면 점수(?score=현재점수)를 품고 결과 페이지로 날아갑니다.
            alert(`게임 종료! 총 획득 수익: ${score}원`);
            location.href = `result.html?score=${score}`; 
            return;
        }

        let anyItemCooking = false;

        grillZones.forEach((zone, index) => {
            const el = grillEls[index];
            const imgEl = el.querySelector('.ingredient-img');

            if (zone.isOccupied) {
                if (zone.status === 'burned') {
                    if (imgEl) imgEl.style.backgroundImage = `url('${assetImages[zone.type + '_burned']}')`;
                    el.classList.remove('cooking');
                    return;
                }

                zone.time += 0.1;
                zone.sideTime += 0.1;

                if (zone.type === 'patty') {
                    if (!zone.isFlipped) {
                        // 🥩 [앞면 구울 때]
                        if (zone.sideTime < 3) {
                            zone.status = 'raw';
                        } else if (zone.sideTime >= 3 && zone.sideTime <= 4) {
                            zone.status = 'front_cooked'; // 앞면 완벽히 익음 -> 노릇한 이미지
                        } else {
                            zone.status = 'burned'; 
                            zone.frontStatus = 'burned';
                        }
                    } else {
                        // 🥩 [뒷면 구울 때]
                        if (zone.sideTime < 3) {
                            zone.status = 'raw'; // 💡 [핵심 수정] 뒤집은 직후 3초 전까지는 다시 생고기 이미지가 보이도록 변경!
                        } else if (zone.sideTime >= 3 && zone.sideTime <= 4) {
                            zone.status = 'cooked'; // 뒷면까지 완벽히 익음 -> 완숙 이미지
                        } else {
                            zone.status = 'burned'; 
                        }
                    }
                } else if (zone.type === 'onion') {
                    if (zone.time < 2.5) {
                        zone.status = 'raw';
                    } else if (zone.time >= 2.5 && zone.time <= 3.5) {
                        zone.status = 'cooked';
                    } else {
                        zone.status = 'burned';
                    }
                }

                // 실시간 이미지 반영
                if (zone.status !== 'burned') {
                    let currentKey = `${zone.type}_${zone.status}`;
                    if (assetImages[currentKey] && imgEl) {
                        imgEl.style.backgroundImage = `url('${assetImages[currentKey]}')`;
                    }
                    el.classList.add('cooking');
                    anyItemCooking = true; 
                } else {
                    if (imgEl) imgEl.style.backgroundImage = `url('${assetImages[zone.type + '_burned']}')`;
                    el.classList.remove('cooking');
                }
            } else {
                el.classList.remove('cooking');
            }
        });

        handleSizzleSound(anyItemCooking);

    }, 100);
}

window.onload = init;