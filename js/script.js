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
// 3. 게임 엔진 초기화
// ==========================================
function init() {
    window.addEventListener('contextmenu', e => e.preventDefault());

    // 오디오 파일(audio.js)에 구현된 BGM 재생 함수 호출
    const unlockAndPlayBGM = () => {
        playBackgroundBGM();
        window.removeEventListener('click', unlockAndPlayBGM);
        window.removeEventListener('mousedown', unlockAndPlayBGM);
    };

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
                    zoneEl.style.backgroundImage = `url('${assetImages[zone.type + '_raw']}')`;
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
                let layerName = mouseHolding.type;
                
                if (mouseHolding.type === 'patty') {
                    layerName += `_${mouseHolding.status}_${mouseHolding.displayStatus}`;
                } else if (mouseHolding.type === 'onion') {
                    layerName += `_${mouseHolding.status}`;
                }
                
                if (mouseHolding.type === 'source1' || mouseHolding.type === 'source2') {
                    // audio.js의 소스 사운드 함수 호출
                    playSquirtSound();

                    const topItem = bag.stack.length > 0 ? bag.stack[bag.stack.length - 1] : "";

                    if (topItem.startsWith(mouseHolding.type)) {
                        const currentCount = parseInt(topItem.split('_')[1]);
                        if (currentCount < 3) {
                            bag.stack[bag.stack.length - 1] = `${mouseHolding.type}_${currentCount + 1}`;
                            renderBagStack(id);
                            return; 
                        } else {
                            return; 
                        }
                    } else {
                        layerName += `_1`;
                    }
                }

                bag.stack.push(layerName);
                renderBagStack(id);

                if (mouseHolding.type !== 'source1' && mouseHolding.type !== 'source2') {
                    clearMouseHolding();
                }
            } else {
                if (bag.stack.length > 0) {
                    bag.isPacked = true;
                    bagEl.classList.add('packed');
                    bagEl.querySelector('.bag-name').innerText = `🎁 포장 완료`;
                }
            }
        });
    });

    bellBtn.addEventListener('click', () => {
        playBellSound();

        let hasPackedBurger = false; 
        let isPerfectSubmit = true;  
        let isJangnanAny = false; // "장난해?" 조건 (빵 부족 등)이 하나라도 있는지
        let earnedMoneyTotal = 0; // 이번 서빙으로 번 총 금액 (성공 여부 판단용)

        // 💬 대사창 박스 DOM 캐싱 및 초기 스킨 리셋
        const dialogueBox = document.getElementById('dialogue-box');
        dialogueBox.className = ''; 
        dialogueBox.innerText = '';

        burgerBags.forEach((bag, index) => {
            if (bag.isPacked) {
                hasPackedBurger = true;

                // 절대 필수조건 엄격하게 필터링 카운트 진행
                let bunCount = 0;
                let pattyCount = 0;
                bag.stack.forEach(item => {
                    if (item.startsWith('bun')) bunCount++;
                    if (item.startsWith('patty')) pattyCount++;
                });

                let earnedMoney = 0;
                let isCurrentJangnan = false;

                // 빵이 2개 미만이거나 패티가 단 1개도 없다면 "지금 장난해?" 트리거로 직행
                if (bunCount < 2 || pattyCount < 1) {
                    earnedMoney = 0;
                    isCurrentJangnan = true;
                    isJangnanAny = true; // 전체 서빙 결과에 장난 포함됨 표시
                    isPerfectSubmit = false;
                } else {
                    earnedMoney = calculateBurgerPrice(bag.stack);
                    
                    // 버거가 타거나 형편없어서 가치가 6000원 이하일 때 (0원 처리 후 분노)
                    if (earnedMoney <= 6000) {
                        earnedMoney = 0;
                        isPerfectSubmit = false; // 완벽 실패이므로 퍼펙트 아님
                    }
                    // 정상 판매했지만 감점이 있어 10000원 미만일 때
                    else if (earnedMoney > 0 && earnedMoney < 10000) {
                        isPerfectSubmit = false; 
                    }
                }

                score += earnedMoney;
                earnedMoneyTotal += earnedMoney; // 총 수익 합산
                bag.stack = [];
                bag.isPacked = false;
                
                const bagEl = bagEls[index];
                bagEl.classList.remove('packed');
                
                // 🛑 [봉지별 말풍선 옵션 출력 시나리오]
                if (isCurrentJangnan) {
                    bagEl.querySelector('.bag-name').innerText = `빵봉지 ${index + 1} (장난 금지!)`;
                    // 말풍선은 늘님 캐릭터 리액션 시점에 한 번만 출력하므로 여기서는 처리 안 함
                } else if (earnedMoney === 0) {
                    bagEl.querySelector('.bag-name').innerText = `빵봉지 ${index + 1} (맛없어서 0원!)`;
                } else {
                    bagEl.querySelector('.bag-name').innerText = `빵봉지 ${index + 1}`;
                }
                renderBagStack(index);
            }
        });
        
        scoreEl.innerText = score + "원";

        // ==========================================
        // 🎬 2. 서빙 피드백 캐릭터 이미지 & 말풍선 리액션 (★여기 수정★)
        // ==========================================
        if (hasPackedBurger) {
            if (reactionTimeout) clearTimeout(reactionTimeout); 

            // 1) 장난 버거(빵/패티 부족)가 하나라도 포함된 경우 -> 무조건 "분노(Jangnan)"
            if (isJangnanAny) {
                reactionImg.src = 'images/clear_fail.png'; // 분노 이미지 사용 (또는 jangnan용 이미지가 있다면 교체)
                dialogueBox.className = 'bubble-bad';
                dialogueBox.innerText = "지금 장난해?!";
            }
            // 2) 모든 버거가 0원 처리된 경우 (형편없음) -> "형편없음(Fail)"
            else if (earnedMoneyTotal === 0) {
                reactionImg.src = 'images/clear_fail.png'; // 실패(분노) 이미지
                dialogueBox.className = 'bubble-bad';
                dialogueBox.innerText = "이딴 걸 먹으라고 준 거야?!";
            }
            // 3) 제출한 모든 버거가 10000원짜리 황금 레시피인 경우 -> "대만족(Perfect)"
            else if (isPerfectSubmit) {
                reactionImg.src = 'images/clear_perfect.png'; // 완벽 이미지
                dialogueBox.className = 'bubble-good';
                dialogueBox.innerText = "이거지! 야르~";
            }
            // 4) 0원은 아니지만(판매 성공) 퍼펙트는 아닌 경우 (감점 있음) -> "먹을만함(Soso)" ★새로 추가★
            else {
                reactionImg.src = 'images/clear_soso.png'; // 쩝쩝 이미지가 들어갈 자리
                dialogueBox.className = 'bubble-good'; // 테두리는 초록색(성공) 유지
                dialogueBox.innerText = "쩝쩝쩝 먹을만하네"; // 요청하신 대사로 변경
            }

            reactionContainer.classList.remove('reaction-hidden');

            reactionTimeout = setTimeout(() => {
                burgerBags.forEach((b, index) => {
                    bagEls[index].querySelector('.bag-name').innerText = `빵봉지 ${index + 1}`;
                });
                reactionContainer.classList.add('reaction-hidden');
                dialogueBox.className = '';
                dialogueBox.innerText = '';
            }, 1200); // 리액션 시간을 1200ms로 늘려 대사를 읽을 시간을 줌
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
            imagePath = "images/red_source.png";      
        }
        else if (mouseHolding.type === "source2") {
            imagePath = "images/white_source.png";
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
    zoneEl.style.backgroundColor = '#777';
    zoneEl.style.backgroundImage = 'none';
    zoneEl.style.borderStyle = 'dashed';
    zoneEl.style.borderColor = '#222';
    zoneEl.innerHTML = `구역 ${id+1}<br><span class="status">비어있음</span>`;
}

// ==========================================
// 🍔 7. 조합형 렌더링 함수
// ==========================================
function renderBagStack(bagId) {
    const stackArea = bagEls[bagId].querySelector('.burger-stack');
    stackArea.innerHTML = ''; 
    
    let currentBottom = 5; 

    burgerBags[bagId].stack.forEach((layer, index) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer';
        
        const parts = layer.split('_');
        const rawType = parts[0]; 
        let imgKey = layer;
        let currentKey = rawType;

        // ⭕ [아래 빵 고정 규칙]: 최초로 빌드된 첫 번째 빵만 bun_bottom 처리
        if (rawType === 'bun') {
            let hasPreviousBun = false;
            for (let i = 0; i < index; i++) {
                if (burgerBags[bagId].stack[i].startsWith('bun')) {
                    hasPreviousBun = true;
                    break;
                }
            }

            if (hasPreviousBun) {
                imgKey = 'bun_top';        
                currentKey = 'bun_top';
                layerDiv.classList.add('layer-bun-top');
            } else {
                imgKey = 'bun_bottom';     
                currentKey = 'bun_bottom';
                layerDiv.classList.add('layer-bun-bottom');
            }
        } else if (rawType === 'source1' || rawType === 'source2') {
            currentKey = rawType;
            layerDiv.classList.add('layer-source');
        } else if (rawType === 'patty') {
            layerDiv.classList.add(`layer-${rawType}`);
            const backStatus = parts[3] || parts[1];
            imgKey = `patty_${backStatus}`; 
        } else if (rawType === 'onion') {
            layerDiv.classList.add(`layer-${rawType}`);
            if (parts[1] === 'raw' && parts[2] === 'half') {
                imgKey = 'onion_raw';
            }
        } else {
            layerDiv.classList.add(`layer-${rawType}`);
        }

        if (index > 0) {
            const previousLayer = burgerBags[bagId].stack[index - 1];
            const prevType = previousLayer.split('_')[0]; 
            let prevKey = previousLayer; 

            if (prevType === 'bun' && index - 1 === 0) {
                prevKey = 'bun_bottom';
            } else if (prevType === 'source1' || prevType === 'source2') {
                prevKey = prevType;
            }

            let comboName = `${prevKey}_${currentKey}`;
            let gap = 0;

            if (combinationGaps[comboName] !== undefined) {
                gap = combinationGaps[comboName];
            } else {
                const fallbackKey = `${prevType}_${currentKey}`;
                if (combinationGaps[fallbackKey] !== undefined) {
                    gap = combinationGaps[fallbackKey];
                } else {
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
// 8. 실시간 조리 타이머 루프 Engine
// ==========================================
function startGameLoop() {
    gameInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = Math.ceil(timeLeft / 10);

        if (timeLeft <= 0) {
            clearInterval(gameInterval);
            alert(`게임 종료! 총 획득 수익: ${score}원`);
            location.reload();
        }

        let anyItemCooking = false;

        grillZones.forEach((zone, index) => {
            const el = grillEls[index];
            if (zone.isOccupied) {
                const statusSpan = el.querySelector('.status');

                if (zone.status === 'burned') {
                    statusSpan.innerText = `${zone.type === 'patty' ? '고기' : '양파'} 완전히 탐! [수거만 가능]`;
                    el.style.backgroundImage = `url('${assetImages[zone.type + '_burned']}')`;
                    el.classList.remove('cooking');
                    return;
                }

                zone.time += 0.1;
                zone.sideTime += 0.1;

                if (zone.type === 'patty') {
                    if (!zone.isFlipped) {
                        if (zone.sideTime < 3) {
                            zone.status = 'raw';
                            statusSpan.innerText = `첫면 굽는중 ${zone.sideTime.toFixed(1)}초`;
                        } else if (zone.sideTime >= 3 && zone.sideTime <= 4) {
                            zone.status = 'raw'; 
                            statusSpan.innerText = `🔥 뒤집어! ${zone.sideTime.toFixed(1)}초`;
                        } else {
                            zone.status = 'burned'; 
                            zone.frontStatus = 'burned';
                        }
                    } else {
                        if (zone.sideTime < 3) {
                            zone.status = 'raw';
                            statusSpan.innerText = `뒷면 굽는중 ${zone.sideTime.toFixed(1)}초`;
                        } else if (zone.sideTime >= 3 && zone.sideTime <= 4) {
                            zone.status = 'cooked';
                            statusSpan.innerText = `✨ 뒷면 완벽! ${zone.sideTime.toFixed(1)}초`;
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
                    statusSpan.innerText = `양파[${zone.status}] ${zone.time.toFixed(1)}초`;
                }

                if (zone.status !== 'burned') {
                    let currentKey = `${zone.type}_${zone.status}`;
                    if (assetImages[currentKey]) {
                        el.style.backgroundImage = `url('${assetImages[currentKey]}')`;
                    }
                    el.classList.add('cooking');
                    anyItemCooking = true; 
                } else {
                    el.style.backgroundImage = `url('${assetImages[zone.type + '_burned']}')`;
                    el.classList.remove('cooking');
                }
            } else {
                el.classList.remove('cooking');
            }
        }); 

        // audio.js에 이관된 효과음 함수 호출
        handleSizzleSound(anyItemCooking);

    }, 100);
}

window.onload = init;