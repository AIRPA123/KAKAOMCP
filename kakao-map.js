/**
 * 카카오맵 API 래퍼 클래스
 * 지도 초기화, 마커 관리, 위치 검색 기능 제공
 */

class KakaoMapManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.currentMarker = null;
        this.options = {
            center: options.center || { lat: 37.5665, lng: 126.9780 }, // 서울 시청
            level: options.level || 3,
            ...options
        };
    }

    /**
     * 지도 초기화
     */
    initialize() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('지도 컨테이너를 찾을 수 없습니다:', this.containerId);
            return;
        }

        const mapOption = {
            center: new kakao.maps.LatLng(this.options.center.lat, this.options.center.lng),
            level: this.options.level
        };

        this.map = new kakao.maps.Map(container, mapOption);

        // 지도 클릭 이벤트
        kakao.maps.event.addListener(this.map, 'click', (mouseEvent) => {
            const latlng = mouseEvent.latLng;
            this.setMarker(latlng.getLat(), latlng.getLng());

            if (this.options.onClick) {
                this.options.onClick(latlng.getLat(), latlng.getLng());
            }
        });

        console.log('카카오맵 초기화 완료');
    }

    /**
     * 마커 설정
     */
    setMarker(lat, lng, options = {}) {
        // 지도가 초기화되지 않았으면 마커 표시 건너뜀
        if (!this.map) {
            console.warn('지도가 초기화되지 않아 마커를 표시할 수 없습니다.');
            return null;
        }

        try {
            // 기존 마커 제거
            if (this.currentMarker) {
                this.currentMarker.setMap(null);
            }

            const position = new kakao.maps.LatLng(lat, lng);

            const markerOptions = {
                position: position,
                map: this.map
            };

            if (options.image) {
                const imageSize = new kakao.maps.Size(options.imageWidth || 40, options.imageHeight || 40);
                const markerImage = new kakao.maps.MarkerImage(options.image, imageSize);
                markerOptions.image = markerImage;
            }

            this.currentMarker = new kakao.maps.Marker(markerOptions);

            // 지도 중심 이동
            this.map.setCenter(position);

            return this.currentMarker;
        } catch (e) {
            console.error('마커 설정 중 오류:', e);
            return null;
        }
    }

    /**
     * 현재 위치 가져오기
     */
    getCurrentLocation(callback) {
        // 1. 브라우저 Geolocation API 시도
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    console.log('GPS 위치 성공:', lat, lng);
                    this.setMarker(lat, lng);
                    if (callback) callback(lat, lng);
                },
                (error) => {
                    console.warn('GPS 위치 실패, IP 위치 추적 시도:', error.message);
                    this._getIpLocation(callback);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            console.warn('Geolocation 미지원, IP 위치 추적 시도');
            this._getIpLocation(callback);
        }
    }

    /**
     * IP 기반 위치 가져오기 (Fallback)
     */
    _getIpLocation(callback) {
        // alert('IP 위치 추적(ip-api)을 시도합니다...'); // 디버깅용 비활성화

        // 5초 타임아웃 설정
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        fetch('http://ip-api.com/json/', { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    console.log('IP 위치 성공:', data);
                    // alert(`IP 위치 확인 성공!\n지역: ${data.city}\n좌표: ${data.lat}, ${data.lon}`); // 성공 알림
                    const lat = data.lat;
                    const lng = data.lon;

                    this.setMarker(lat, lng);
                    if (callback) callback(lat, lng);
                } else {
                    throw new Error('IP lookup failed status: ' + data.status);
                }
            })
            .catch(error => {
                console.error('IP 위치 추적 실패:', error);

                let errorMsg = error.message;
                if (error.name === 'AbortError') {
                    errorMsg = '호출 시간 초과 (5초)';
                }

                alert(`위치 추적 실패: ${errorMsg}\n\n원인: 네트워크 차단(CORS, 광고차단) 또는 API 오류\n기본 위치(서울)로 이동합니다.`);

                // 최후의 수단: 기본 위치(서울)
                if (callback) callback(this.options.center.lat, this.options.center.lng);
            });
    }

    /**
     * 주소로 좌표 검색
     */
    searchAddress(address, callback) {
        const geocoder = new kakao.maps.services.Geocoder();

        geocoder.addressSearch(address, (result, status) => {
            if (status === kakao.maps.services.Status.OK) {
                const lat = parseFloat(result[0].y);
                const lng = parseFloat(result[0].x);

                this.setMarker(lat, lng);
                callback(lat, lng, result[0]);
            } else {
                console.error('주소 검색 실패:', status);
                callback(null, null, null);
            }
        });
    }

    /**
     * 키워드로 장소 검색
     */
    searchPlace(keyword, callback) {
        const ps = new kakao.maps.services.Places();

        ps.keywordSearch(keyword, (data, status) => {
            if (status === kakao.maps.services.Status.OK) {
                callback(data);
            } else {
                console.error('장소 검색 실패:', status);
                callback([]);
            }
        });
    }

    /**
     * 지도 레벨 변경
     */
    setLevel(level) {
        this.map.setLevel(level);
    }

    /**
     * 지도 중심 이동
     */
    setCenter(lat, lng) {
        const position = new kakao.maps.LatLng(lat, lng);
        this.map.setCenter(position);
    }

    /**
     * 현재 지도 중심 좌표 가져오기
     */
    getCenter() {
        const center = this.map.getCenter();
        return {
            lat: center.getLat(),
            lng: center.getLng()
        };
    }

    /**
     * 모든 마커 제거
     */
    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];

        if (this.currentMarker) {
            this.currentMarker.setMap(null);
            this.currentMarker = null;
        }
    }

    /**
     * 여러 마커 추가
     */
    addMarkers(positions) {
        this.clearMarkers();

        positions.forEach(pos => {
            const marker = new kakao.maps.Marker({
                position: new kakao.maps.LatLng(pos.lat, pos.lng),
                map: this.map
            });

            if (pos.title) {
                const infowindow = new kakao.maps.InfoWindow({
                    content: `<div style="padding:5px;">${pos.title}</div>`
                });

                kakao.maps.event.addListener(marker, 'mouseover', () => {
                    infowindow.open(this.map, marker);
                });

                kakao.maps.event.addListener(marker, 'mouseout', () => {
                    infowindow.close();
                });
            }

            this.markers.push(marker);
        });
    }
}
