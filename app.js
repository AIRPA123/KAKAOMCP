/**
 * 메인 애플리케이션
 * 카카오맵, 기상청 API, 생활 지수를 통합 관리
 */

class WeatherLifeApp {
    constructor() {
        this.mapManager = null;
        this.weatherAPI = new WeatherAPI();
        this.currentLocation = {
            lat: 37.5665,
            lng: 126.9780,
            name: '서울'
        };
        this.weatherData = null;
    }

    /**
     * 앱 초기화
     */
    async initialize() {
        console.log('앱 초기화 시작...');

        // 카카오맵 초기화
        console.log('카카오맵 초기화 중...');
        this.initializeMap();
        console.log('카카오맵 초기화 완료');

        // 이벤트 리스너 설정
        console.log('이벤트 리스너 설정 중...');
        this.setupEventListeners();
        console.log('이벤트 리스너 설정 완료');

        // 현재 시간 표시
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 60000); // 1분마다 업데이트

        // 서울 날씨로 즉시 시작 (사용자가 위치 권한을 주지 않아도 작동)
        console.log('서울 날씨 조회 시작...');
        await this.updateWeather(37.5665, 126.9780, '서울');
        console.log('서울 날씨 조회 완료');
    }

    /**
     * 카카오맵 초기화
     */
    initializeMap() {
        try {
            // kakao SDK 확인
            if (typeof kakao === 'undefined' || typeof kakao.maps === 'undefined') {
                console.warn('카카오 맵 SDK가 로드되지 않았습니다. 지도 없이 계속합니다.');
                console.warn('카카오 개발자 센터(https://developers.kakao.com)에서 플랫폼에 localhost:3000을 등록해주세요.');
                return;
            }

            this.mapManager = new KakaoMapManager('map', {
                center: { lat: this.currentLocation.lat, lng: this.currentLocation.lng },
                level: 3,
                onClick: (lat, lng) => {
                    this.updateWeather(lat, lng);
                }
            });

            this.mapManager.initialize();
            console.log('카카오맵 초기화 성공');
        } catch (error) {
            console.error('카카오맵 초기화 실패:', error);
            console.warn('지도 기능 없이 계속합니다.');
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 검색 버튼
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.searchLocation();
        });

        // 검색 입력 엔터키
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchLocation();
            }
        });

        // 현재 위치 버튼
        document.getElementById('currentLocationBtn').addEventListener('click', () => {
            this.loadCurrentLocation();
        });

        // 공유 버튼
        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareToKakao();
        });
    }

    /**
     * 현재 시간 업데이트
     */
    updateCurrentTime() {
        const now = new Date();
        const timeString = DateHelper.getCurrentReadableTime();
        document.getElementById('currentTime').textContent = timeString;
    }

    /**
   * 현재 위치 로드
   */
    loadCurrentLocation() {
        if (!this.mapManager) {
            console.warn('지도가 초기화되지 않았습니다. 기본 위치(서울)를 사용합니다.');
            this.updateWeather(37.5665, 126.9780, '서울 (기본 위치)');
            return;
        }

        this.showLoading();

        // 타임아웃 설정 (10초)
        const timeout = setTimeout(() => {
            console.log('위치 정보 타임아웃 (10초) - 서울로 기본 설정');
            this.updateWeather(37.5665, 126.9780, '서울 (기본 위치)');
        }, 10000);

        this.mapManager.getCurrentLocation((lat, lng) => {
            clearTimeout(timeout);
            this.updateWeather(lat, lng, '현재 위치');
        });
    }

    /**
     * 위치 검색
     */
    searchLocation() {
        const keyword = document.getElementById('searchInput').value.trim();

        if (!keyword) {
            alert('검색어를 입력해주세요.');
            return;
        }

        if (!this.mapManager) {
            alert('지도 기능을 사용할 수 없습니다. 카카오 개발자 센터에서 도메인을 등록해주세요.');
            return;
        }

        this.showLoading();

        // 주소 검색 시도
        this.mapManager.searchAddress(keyword, (lat, lng, result) => {
            if (lat && lng) {
                const locationName = result.address_name || keyword;
                this.updateWeather(lat, lng, locationName);
            } else {
                // 주소 검색 실패 시 장소 검색
                this.mapManager.searchPlace(keyword, (places) => {
                    if (places.length > 0) {
                        const place = places[0];
                        const lat = parseFloat(place.y);
                        const lng = parseFloat(place.x);
                        this.updateWeather(lat, lng, place.place_name);
                    } else {
                        this.hideLoading();
                        alert('검색 결과가 없습니다.');
                    }
                });
            }
        });
    }

    /**
     * 날씨 정보 업데이트
     */
    async updateWeather(lat, lng, locationName = '') {
        try {
            console.log(`updateWeather 호출: lat=${lat}, lng=${lng}, location=${locationName}`);
            this.showLoading();

            // coordConverter 확인
            if (typeof coordConverter === 'undefined') {
                throw new Error('coordConverter가 정의되지 않았습니다');
            }

            // 위경도를 격자 좌표로 변환
            console.log('격자 좌표 변환 중...');
            const grid = coordConverter.toGrid(lat, lng);
            console.log('격자 좌표:', grid);

            // 날씨 데이터 조회
            console.log('날씨 데이터 조회 중...');
            this.weatherData = await this.weatherAPI.getForecast(grid.nx, grid.ny);
            console.log('날씨 데이터:', this.weatherData);

            // 현재 위치 정보 저장
            this.currentLocation = { lat, lng, name: locationName };

            // UI 업데이트
            console.log('UI 업데이트 중...');
            this.updateWeatherUI();
            this.updateLifeIndices();

            this.hideLoading();
            console.log('날씨 정보 업데이트 완료');

        } catch (error) {
            console.error('날씨 정보 조회 실패:', error);
            console.error('에러 스택:', error.stack);
            this.hideLoading();
            alert(`날씨 정보를 가져오는데 실패했습니다.\n에러: ${error.message}`);
        }
    }

    /**
     * 날씨 UI 업데이트
     */
    updateWeatherUI() {
        const { current } = this.weatherData;

        // 위치명
        document.getElementById('locationName').textContent = this.currentLocation.name || '선택한 위치';

        // 날씨 아이콘
        const weatherIcon = this.getWeatherIcon(current);
        document.getElementById('weatherIcon').textContent = weatherIcon;

        // 기온
        document.getElementById('temperature').textContent = Math.round(current.temperature || 0);

        // 날씨 설명
        let description = current.sky || '알 수 없음';
        if (current.precipitation && current.precipitation !== '없음') {
            description = current.precipitation;
        }
        document.getElementById('weatherDescription').textContent = description;

        // 상세 정보
        document.getElementById('humidity').textContent = `${current.humidity || 0}%`;
        document.getElementById('rainProbability').textContent = `${current.rainProbability || 0}%`;
        document.getElementById('windSpeed').textContent = `${current.windSpeed || 0}m/s`;
        document.getElementById('windDirection').textContent = current.windDirection || '-';
    }

    /**
     * 날씨 아이콘 선택
     */
    getWeatherIcon(weather) {
        if (weather.precipitationCode !== '0') {
            if (weather.precipitationCode === '3') return '❄️'; // 눈
            if (weather.precipitationCode === '2') return '🌨️'; // 비/눈
            return '🌧️'; // 비
        }

        if (weather.skyCode === '1') return '☀️'; // 맑음
        if (weather.skyCode === '3') return '⛅'; // 구름많음
        if (weather.skyCode === '4') return '☁️'; // 흐림

        return '🌤️';
    }

    /**
     * 생활 지수 업데이트
     */
    updateLifeIndices() {
        const indices = LifeIndices.calculateAll(this.weatherData);
        const container = document.getElementById('indicesGrid');

        container.innerHTML = '';

        indices.forEach(index => {
            const card = this.createIndexCard(index);
            container.appendChild(card);
        });
    }

    /**
     * 생활 지수 카드 생성
     */
    createIndexCard(index) {
        const card = document.createElement('div');
        card.className = 'index-card glass fade-in';

        card.innerHTML = `
      <div class="index-header">
        <div class="index-title">
          <span class="index-icon">${index.icon}</span>
          <span>${index.name}</span>
        </div>
        <span class="index-grade" style="background-color: ${index.color}33;">
          ${index.grade}
        </span>
      </div>
      
      <div class="index-score">
        <span class="score-value" style="color: ${index.color};">${index.score}</span>
        <span class="score-max">/100</span>
      </div>
      
      <div class="score-bar">
        <div class="score-fill" style="width: ${index.score}%; background-color: ${index.color};"></div>
      </div>
      
      <p class="index-description">${index.description}</p>
      
      <ul class="index-reasons">
        ${index.reasons.map(reason => `<li>• ${reason}</li>`).join('')}
      </ul>
      
      <div class="index-recommendation" style="border-left: 3px solid ${index.color};">
        💡 ${index.recommendation}
      </div>
    `;

        return card;
    }

    /**
     * 카카오톡 공유
     */
    shareToKakao() {
        if (!this.weatherData) {
            alert('날씨 정보를 먼저 조회해주세요.');
            return;
        }

        const { current } = this.weatherData;
        const indices = LifeIndices.calculateAll(this.weatherData);

        // 상위 3개 지수
        const topIndices = indices
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(idx => `${idx.icon} ${idx.name}: ${idx.grade}`)
            .join('\n');

        Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: `${this.currentLocation.name} 날씨 생활 지수`,
                description: `🌡️ ${Math.round(current.temperature)}°C | ${current.sky}\n\n${topIndices}`,
                imageUrl: 'https://via.placeholder.com/800x400?text=Weather+Life+Assistant',
                link: {
                    mobileWebUrl: window.location.href,
                    webUrl: window.location.href,
                },
            },
            buttons: [
                {
                    title: '자세히 보기',
                    link: {
                        mobileWebUrl: window.location.href,
                        webUrl: window.location.href,
                    },
                },
            ],
        });
    }

    /**
     * 로딩 표시
     */
    showLoading() {
        document.getElementById('weatherCard').classList.add('hidden');
        document.getElementById('indicesSection').classList.add('hidden');
        document.getElementById('shareSection').classList.add('hidden');
        document.getElementById('loading').classList.remove('hidden');
    }

    /**
     * 로딩 숨김
     */
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('weatherCard').classList.remove('hidden');
        document.getElementById('indicesSection').classList.remove('hidden');
        document.getElementById('shareSection').classList.remove('hidden');
    }
}

// 앱 시작
let app;

// 카카오맵 SDK 로드 완료 후 앱 초기화
window.addEventListener('load', () => {
    // 카카오 SDK 초기화
    if (typeof Kakao !== 'undefined') {
        Kakao.init('71ba545896d400bc71107513f0c425ef');
        console.log('카카오 SDK 초기화 완료');
    }

    // 앱 초기화
    app = new WeatherLifeApp();
    app.initialize();
});
