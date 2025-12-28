/**
 * 기상청 단기예보 API 클라이언트
 * 공공데이터포털 기상청 단기예보 조회 서비스 연동
 */

class WeatherAPI {
    constructor() {
        this.serviceKey = '9375ba86f739d4382c767d3d82c26d4d869faaa746916004a0f8a34563f3344f';
        this.baseUrl = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10분 캐시
    }

    /**
     * 단기예보 조회
     * @param {number} nx - 격자 X 좌표
     * @param {number} ny - 격자 Y 좌표
     * @returns {Promise<Object>} 날씨 데이터
     */
    async getForecast(nx, ny) {
        const cacheKey = `${nx}_${ny}`;

        // 캐시 확인
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('캐시된 데이터 사용:', cacheKey);
                return cached.data;
            }
        }

        const { baseDate, baseTime } = DateHelper.getBaseDateTime();

        const params = new URLSearchParams({
            serviceKey: this.serviceKey,
            pageNo: '1',
            numOfRows: '1000',
            dataType: 'JSON',
            base_date: baseDate,
            base_time: baseTime,
            nx: nx.toString(),
            ny: ny.toString()
        });

        const url = `${this.baseUrl}?${params.toString()}`;

        try {
            console.log('기상청 API 호출:', { baseDate, baseTime, nx, ny });

            const response = await fetch(url);
            const textData = await response.text();
            let data;

            try {
                data = JSON.parse(textData);
            } catch (e) {
                // JSON 파싱 실패 시 (API Rate Limit 등 텍스트 에러 반환 시)
                console.error('API 응답 파싱 실패:', textData);
                throw new Error(`기상청 API 오류 (응답 형식): ${textData.substring(0, 100)}...`);
            }

            if (data.response.header.resultCode !== '00') {
                throw new Error(`API 오류: ${data.response.header.resultMsg}`);
            }

            const items = data.response.body.items.item;
            const weatherData = this.parseWeatherData(items);

            // 캐시 저장
            this.cache.set(cacheKey, {
                data: weatherData,
                timestamp: Date.now()
            });

            return weatherData;

        } catch (error) {
            console.error('기상청 API 호출 실패:', error);
            throw error;
        }
    }

    /**
     * API 응답 데이터 파싱
     * @param {Array} items - API 응답 아이템 배열
     * @returns {Object} 정리된 날씨 데이터
     */
    parseWeatherData(items) {
        const forecast = {};

        items.forEach(item => {
            const { fcstDate, fcstTime, category, fcstValue } = item;
            const key = `${fcstDate}_${fcstTime}`;

            if (!forecast[key]) {
                forecast[key] = {
                    date: fcstDate,
                    time: fcstTime,
                    dateTime: DateHelper.toReadableDateTime(fcstDate, fcstTime)
                };
            }

            // 카테고리별 데이터 매핑
            switch (category) {
                case 'TMP': // 기온
                    forecast[key].temperature = parseFloat(fcstValue);
                    break;
                case 'TMN': // 최저기온
                    forecast[key].minTemperature = parseFloat(fcstValue);
                    break;
                case 'TMX': // 최고기온
                    forecast[key].maxTemperature = parseFloat(fcstValue);
                    break;
                case 'SKY': // 하늘상태 (1:맑음, 3:구름많음, 4:흐림)
                    forecast[key].sky = this.getSkyStatus(fcstValue);
                    forecast[key].skyCode = fcstValue;
                    break;
                case 'PTY': // 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기)
                    forecast[key].precipitation = this.getPrecipitationType(fcstValue);
                    forecast[key].precipitationCode = fcstValue;
                    break;
                case 'POP': // 강수확률
                    forecast[key].rainProbability = parseInt(fcstValue);
                    break;
                case 'PCP': // 1시간 강수량
                    forecast[key].rainfall = fcstValue;
                    break;
                case 'REH': // 습도
                    forecast[key].humidity = parseInt(fcstValue);
                    break;
                case 'SNO': // 1시간 신적설
                    forecast[key].snowfall = fcstValue;
                    break;
                case 'WSD': // 풍속
                    forecast[key].windSpeed = parseFloat(fcstValue);
                    break;
                case 'VEC': // 풍향
                    forecast[key].windDirection = this.getWindDirection(fcstValue);
                    forecast[key].windDegree = parseInt(fcstValue);
                    break;
                case 'WAV': // 파고
                    forecast[key].waveHeight = parseFloat(fcstValue);
                    break;
            }
        });

        // 시간순 정렬
        const sortedForecast = Object.values(forecast).sort((a, b) => {
            const aDateTime = parseInt(a.date + a.time);
            const bDateTime = parseInt(b.date + b.time);
            return aDateTime - bDateTime;
        });

        return {
            current: sortedForecast[0] || {},
            hourly: sortedForecast.slice(0, 24),
            daily: this.aggregateDailyForecast(sortedForecast)
        };
    }

    /**
     * 일별 예보 집계
     * @param {Array} hourlyData - 시간별 예보 데이터
     * @returns {Array} 일별 예보
     */
    aggregateDailyForecast(hourlyData) {
        const dailyMap = new Map();

        hourlyData.forEach(item => {
            if (!dailyMap.has(item.date)) {
                dailyMap.set(item.date, {
                    date: item.date,
                    dateFormatted: DateHelper.formatDate(item.date),
                    dayOfWeek: DateHelper.getDayOfWeek(item.date),
                    temperatures: [],
                    rainProbabilities: [],
                    humidities: [],
                    windSpeeds: [],
                    items: []
                });
            }

            const daily = dailyMap.get(item.date);
            if (item.temperature) daily.temperatures.push(item.temperature);
            if (item.rainProbability) daily.rainProbabilities.push(item.rainProbability);
            if (item.humidity) daily.humidities.push(item.humidity);
            if (item.windSpeed) daily.windSpeeds.push(item.windSpeed);
            if (item.minTemperature) daily.minTemp = item.minTemperature;
            if (item.maxTemperature) daily.maxTemp = item.maxTemperature;
            daily.items.push(item);
        });

        // 일별 통계 계산
        return Array.from(dailyMap.values()).map(day => ({
            ...day,
            avgTemperature: this.average(day.temperatures),
            maxRainProbability: Math.max(...day.rainProbabilities, 0),
            avgHumidity: this.average(day.humidities),
            maxWindSpeed: Math.max(...day.windSpeeds, 0)
        }));
    }

    /**
     * 하늘 상태 텍스트 변환
     */
    getSkyStatus(code) {
        const status = {
            '1': '맑음',
            '3': '구름많음',
            '4': '흐림'
        };
        return status[code] || '알 수 없음';
    }

    /**
     * 강수 형태 텍스트 변환
     */
    getPrecipitationType(code) {
        const types = {
            '0': '없음',
            '1': '비',
            '2': '비/눈',
            '3': '눈',
            '4': '소나기',
            '5': '빗방울',
            '6': '빗방울눈날림',
            '7': '눈날림'
        };
        return types[code] || '없음';
    }

    /**
     * 풍향 텍스트 변환
     */
    getWindDirection(degree) {
        const deg = parseInt(degree);
        const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
        const index = Math.round(deg / 45) % 8;
        return directions[index];
    }

    /**
     * 평균 계산
     */
    average(arr) {
        if (!arr || arr.length === 0) return 0;
        return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10;
    }
}
