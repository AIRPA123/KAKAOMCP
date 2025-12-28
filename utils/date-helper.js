/**
 * 날짜/시간 처리 유틸리티
 * 기상청 API 요청에 필요한 날짜 및 시간 포맷팅
 */

class DateHelper {
    /**
     * 현재 날짜를 YYYYMMDD 형식으로 반환
     * @returns {string} 날짜 문자열
     */
    static getCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    /**
     * 기상청 API 발표 시각 계산
     * 단기예보: 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00 (1일 8회)
     * 현재 시각 기준으로 가장 최근 발표 시각 반환
     * @returns {{baseDate: string, baseTime: string}}
     */
    static getBaseDateTime() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // 발표 시각 (02, 05, 08, 11, 14, 17, 20, 23시)
        const baseTimes = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];

        // 발표 후 10분 뒤부터 데이터 제공 (API 갱신 시간 고려)
        let baseHour = Math.floor((hour + 10 / 60) / 3) * 3 - 1;
        if (baseHour < 2) {
            baseHour = 23;
            now.setDate(now.getDate() - 1);
        }

        // 가장 가까운 발표 시각 찾기
        let baseTimeIndex = Math.floor(baseHour / 3);
        if (baseTimeIndex >= baseTimes.length) {
            baseTimeIndex = baseTimes.length - 1;
        }

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return {
            baseDate: `${year}${month}${day}`,
            baseTime: baseTimes[baseTimeIndex]
        };
    }

    /**
     * 시간 문자열을 HH:MM 형식으로 변환
     * @param {string} timeStr - HHMM 형식의 시간 문자열
     * @returns {string} HH:MM 형식
     */
    static formatTime(timeStr) {
        if (!timeStr || timeStr.length !== 4) return timeStr;
        return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
    }

    /**
     * 날짜 문자열을 YYYY-MM-DD 형식으로 변환
     * @param {string} dateStr - YYYYMMDD 형식의 날짜 문자열
     * @returns {string} YYYY-MM-DD 형식
     */
    static formatDate(dateStr) {
        if (!dateStr || dateStr.length !== 8) return dateStr;
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }

    /**
     * 날짜와 시간을 읽기 쉬운 형식으로 변환
     * @param {string} dateStr - YYYYMMDD 형식
     * @param {string} timeStr - HHMM 형식
     * @returns {string} "YYYY년 MM월 DD일 HH:MM" 형식
     */
    static toReadableDateTime(dateStr, timeStr) {
        if (!dateStr || !timeStr) return '';

        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = timeStr.substring(0, 2);
        const minute = timeStr.substring(2, 4);

        return `${year}년 ${month}월 ${day}일 ${hour}:${minute}`;
    }

    /**
     * 현재 시각을 읽기 쉬운 형식으로 반환
     * @returns {string}
     */
    static getCurrentReadableTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');

        return `${year}년 ${month}월 ${day}일 ${hour}:${minute}`;
    }

    /**
     * 요일 반환
     * @param {string} dateStr - YYYYMMDD 형식
     * @returns {string} 요일
     */
    static getDayOfWeek(dateStr) {
        if (!dateStr || dateStr.length !== 8) return '';

        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));

        const date = new Date(year, month, day);
        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

        return days[date.getDay()];
    }
}
