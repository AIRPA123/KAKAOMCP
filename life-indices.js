/**
 * 생활 지수 계산 엔진
 * 날씨 데이터를 기반으로 다양한 생활 지수를 계산
 */

class LifeIndices {
    /**
     * 모든 생활 지수 계산
     * @param {Object} weatherData - 날씨 데이터
     * @returns {Array} 생활 지수 배열
     */
    static calculateAll(weatherData) {
        const { current, daily } = weatherData;

        return [
            this.calculateLaundryIndex(current, daily),
            this.calculateCarWashIndex(daily),
            this.calculateDogWalkIndex(current),
            this.calculateCampingIndex(current, daily),
            this.calculateExerciseIndex(current),
            this.calculateStargazingIndex(current),
            this.calculateFoodPoisoningIndex(current),
            this.calculateColdWarningIndex(current, daily)
        ];
    }

    /**
     * 빨래 건조 지수
     * 습도, 강수확률, 풍속, 하늘상태 고려
     */
    static calculateLaundryIndex(current, daily) {
        let score = 100;
        let reasons = [];

        // 강수 확률
        if (current.rainProbability >= 70) {
            score -= 50;
            reasons.push('강수 확률이 높습니다');
        } else if (current.rainProbability >= 40) {
            score -= 30;
            reasons.push('비 올 가능성이 있습니다');
        }

        // 습도
        if (current.humidity >= 80) {
            score -= 30;
            reasons.push('습도가 매우 높습니다');
        } else if (current.humidity >= 60) {
            score -= 15;
            reasons.push('습도가 높은 편입니다');
        } else if (current.humidity <= 40) {
            score += 10;
            reasons.push('습도가 낮아 건조가 빠릅니다');
        }

        // 풍속 (적당한 바람은 좋음)
        if (current.windSpeed >= 4 && current.windSpeed <= 8) {
            score += 10;
            reasons.push('적당한 바람이 불어 건조에 좋습니다');
        } else if (current.windSpeed > 10) {
            score -= 20;
            reasons.push('바람이 너무 강합니다');
        }

        // 하늘 상태
        if (current.skyCode === '1') {
            score += 15;
            reasons.push('맑은 날씨입니다');
        } else if (current.skyCode === '4') {
            score -= 10;
            reasons.push('흐린 날씨입니다');
        }

        score = Math.max(0, Math.min(100, score));

        return {
            id: 'laundry',
            name: '빨래 건조',
            icon: '👕',
            score,
            grade: this.getGrade(score),
            color: this.getColor(score),
            description: this.getDescription(score, '빨래를 말리기'),
            reasons: reasons.length > 0 ? reasons : ['보통 수준입니다'],
            recommendation: score >= 70 ? '빨래하기 좋은 날입니다!' :
                score >= 40 ? '실내 건조를 권장합니다' :
                    '빨래를 미루는 것이 좋습니다'
        };
    }

    /**
     * 세차 지수
     * 향후 3일간 강수 예보 분석
     */
    static calculateCarWashIndex(daily) {
        let score = 100;
        let reasons = [];

        // 향후 3일 강수 확률 체크
        const next3Days = daily.slice(0, 3);
        const rainDays = next3Days.filter(day => day.maxRainProbability >= 40);

        if (rainDays.length === 0) {
            score = 100;
            reasons.push('향후 3일간 비 소식이 없습니다');
        } else if (rainDays.length === 1) {
            score = 60;
            reasons.push('1-2일 내 비가 올 수 있습니다');
        } else {
            score = 20;
            reasons.push('며칠간 비가 예상됩니다');
        }

        return {
            id: 'carwash',
            name: '세차',
            icon: '🚗',
            score,
            grade: this.getGrade(score),
            color: this.getColor(score),
            description: this.getDescription(score, '세차하기'),
            reasons,
            recommendation: score >= 70 ? '세차하기 좋은 날입니다!' :
                score >= 40 ? '세차 후 비를 맞을 수 있습니다' :
                    '세차를 미루는 것이 좋습니다'
        };
    }

    /**
     * 반려견 산책 지수
     * 기온, 강수, 체감온도 고려
     */
    static calculateDogWalkIndex(current) {
        let score = 100;
        let reasons = [];

        // 강수
        if (current.precipitationCode !== '0') {
            score -= 60;
            reasons.push(`${current.precipitation} 예보가 있습니다`);
        } else if (current.rainProbability >= 50) {
            score -= 30;
            reasons.push('비 올 확률이 높습니다');
        }

        // 기온
        if (current.temperature >= 30) {
            score -= 40;
            reasons.push('너무 더워 반려견에게 위험할 수 있습니다');
        } else if (current.temperature >= 25) {
            score -= 20;
            reasons.push('더운 날씨입니다. 그늘진 곳으로 산책하세요');
        } else if (current.temperature <= -10) {
            score -= 40;
            reasons.push('너무 추운 날씨입니다');
        } else if (current.temperature <= 0) {
            score -= 20;
            reasons.push('추운 날씨입니다. 옷을 입혀주세요');
        } else if (current.temperature >= 15 && current.temperature <= 22) {
            score += 10;
            reasons.push('산책하기 좋은 기온입니다');
        }

        // 풍속
        if (current.windSpeed > 10) {
            score -= 20;
            reasons.push('바람이 강합니다');
        }

        score = Math.max(0, Math.min(100, score));

        return {
            id: 'dogwalk',
            name: '반려견 산책',
            icon: '🐕',
            score,
            grade: this.getGrade(score),
            color: this.getColor(score),
            description: this.getDescription(score, '산책하기'),
            reasons: reasons.length > 0 ? reasons : ['산책하기 좋은 날씨입니다'],
            recommendation: score >= 70 ? '산책하기 좋습니다!' :
                score >= 40 ? '짧게 산책하세요' :
                    '실내 활동을 권장합니다'
        };
    }

    /**
     * 캠핑 적합도
     * 풍속, 강수, 기온 종합 평가
     */
    static calculateCampingIndex(current, daily) {
        let score = 100;
        let reasons = [];

        // 강풍 체크 (텐트 위험)
        if (current.windSpeed >= 10) {
            score -= 50;
            reasons.push('강풍으로 텐트 설치가 위험합니다');
        } else if (current.windSpeed >= 7) {
            score -= 25;
            reasons.push('바람이 강한 편입니다');
        }

        // 강수
        const today = daily[0];
        if (today && today.maxRainProbability >= 60) {
            score -= 40;
            reasons.push('비가 올 확률이 높습니다');
        } else if (today && today.maxRainProbability >= 30) {
            score -= 20;
            reasons.push('비가 올 수 있습니다');
        }

        // 기온
        if (current.temperature <= 5) {
            score -= 30;
            reasons.push('추운 날씨입니다. 방한 준비 필수');
        } else if (current.temperature >= 30) {
            score -= 20;
            reasons.push('더운 날씨입니다. 그늘막 필수');
        } else if (current.temperature >= 15 && current.temperature <= 25) {
            score += 10;
            reasons.push('캠핑하기 좋은 기온입니다');
        }

        score = Math.max(0, Math.min(100, score));

        return {
            id: 'camping',
            name: '캠핑',
            icon: '⛺',
            score,
            grade: this.getGrade(score),
            color: this.getColor(score),
            description: this.getDescription(score, '캠핑하기'),
            reasons: reasons.length > 0 ? reasons : ['캠핑하기 좋은 날씨입니다'],
            recommendation: score >= 70 ? '캠핑하기 좋습니다!' :
                score >= 40 ? '날씨 변화에 주의하세요' :
                    '캠핑을 연기하는 것이 좋습니다'
        };
    }

    /**
     * 운동하기 좋은 시간
     * 기온, 습도 고려
     */
    static calculateExerciseIndex(current) {
        let score = 100;
        let reasons = [];

        // 기온
        if (current.temperature >= 28) {
            score -= 40;
            reasons.push('더운 날씨입니다. 열사병 주의');
        } else if (current.temperature >= 25) {
            score -= 20;
            reasons.push('더운 편입니다. 수분 섭취 필수');
        } else if (current.temperature <= 0) {
            score -= 30;
            reasons.push('추운 날씨입니다. 준비운동 필수');
        } else if (current.temperature >= 15 && current.temperature <= 22) {
            score += 15;
            reasons.push('운동하기 좋은 기온입니다');
        }

        // 습도
        if (current.humidity >= 80) {
            score -= 25;
            reasons.push('습도가 높아 불쾌감이 있습니다');
        }

        // 강수
        if (current.rainProbability >= 60) {
            score -= 30;
            reasons.push('비가 올 확률이 높습니다');
        }

        score = Math.max(0, Math.min(100, score));

        return {
            id: 'exercise',
            name: '야외 운동',
            icon: '🏃',
            score,
            grade: this.getGrade(score),
            color: this.getColor(score),
            description: this.getDescription(score, '야외 운동하기'),
            reasons: reasons.length > 0 ? reasons : ['운동하기 좋은 날씨입니다'],
            recommendation: score >= 70 ? '운동하기 좋습니다!' :
                score >= 40 ? '실내 운동을 고려하세요' :
                    '실내 운동을 권장합니다'
        };
    }

    /**
     * 별 관측 지수
     * 하늘 상태 고려
     */
    static calculateStargazingIndex(current) {
        let score = 100;
        let reasons = [];

        // 하늘 상태
        if (current.skyCode === '1') {
            score = 100;
            reasons.push('맑은 하늘로 별 관측에 최적입니다');
        } else if (current.skyCode === '3') {
            score = 50;
            reasons.push('구름이 많아 별 보기 어려울 수 있습니다');
        } else {
            score = 10;
            reasons.push('흐린 날씨로 별 관측이 어렵습니다');
        }

        // 강수
        if (current.precipitationCode !== '0') {
            score = 0;
            reasons = ['비/눈이 와서 별 관측이 불가능합니다'];
        }

        return {
            id: 'stargazing',
            name: '별 관측',
            icon: '⭐',
            score,
            grade: this.getGrade(score),
            color: this.getColor(score),
            description: this.getDescription(score, '별 보기'),
            reasons,
            recommendation: score >= 70 ? '별 보기 좋은 밤입니다!' :
                score >= 40 ? '구름 사이로 별을 볼 수 있습니다' :
                    '별 관측이 어렵습니다'
        };
    }

    /**
     * 식중독 주의 지수
     * 기온, 습도 기반
     */
    static calculateFoodPoisoningIndex(current) {
        let score = 0; // 낮을수록 안전
        let reasons = [];

        // 기온과 습도가 높을수록 위험
        if (current.temperature >= 25 && current.humidity >= 60) {
            score = 80;
            reasons.push('고온다습하여 식중독 위험이 높습니다');
        } else if (current.temperature >= 20 && current.humidity >= 50) {
            score = 50;
            reasons.push('식중독 주의가 필요합니다');
        } else {
            score = 20;
            reasons.push('식중독 위험이 낮습니다');
        }

        // 역산 (높을수록 안전하게 표시)
        const safetyScore = 100 - score;

        return {
            id: 'foodsafety',
            name: '식품 안전',
            icon: '🍱',
            score: safetyScore,
            grade: this.getGrade(safetyScore),
            color: this.getColor(safetyScore),
            description: safetyScore >= 70 ? '식품 보관이 안전합니다' :
                safetyScore >= 40 ? '식품 보관에 주의하세요' :
                    '식품 보관에 각별히 주의하세요',
            reasons,
            recommendation: safetyScore >= 70 ? '음식 보관이 비교적 안전합니다' :
                safetyScore >= 40 ? '음식을 냉장 보관하세요' :
                    '음식을 빨리 섭취하거나 냉장 보관하세요'
        };
    }

    /**
     * 감기 조심 지수
     * 일교차, 습도 분석
     */
    static calculateColdWarningIndex(current, daily) {
        let score = 100;
        let reasons = [];

        const today = daily[0];

        // 일교차
        if (today && today.maxTemp && today.minTemp) {
            const tempDiff = today.maxTemp - today.minTemp;
            if (tempDiff >= 15) {
                score -= 50;
                reasons.push(`일교차가 ${tempDiff.toFixed(1)}°C로 매우 큽니다`);
            } else if (tempDiff >= 10) {
                score -= 30;
                reasons.push(`일교차가 ${tempDiff.toFixed(1)}°C로 큽니다`);
            }
        }

        // 습도
        if (current.humidity <= 30) {
            score -= 20;
            reasons.push('건조하여 호흡기 질환 주의');
        }

        // 기온
        if (current.temperature <= 5) {
            score -= 20;
            reasons.push('추운 날씨입니다');
        }

        score = Math.max(0, Math.min(100, score));

        if (reasons.length === 0) {
            reasons.push('건강 관리에 좋은 날씨입니다');
        }

        return {
            id: 'health',
            name: '건강 관리',
            icon: '💊',
            score,
            grade: this.getGrade(score),
            color: this.getColor(score),
            description: this.getDescription(score, '건강 관리'),
            reasons,
            recommendation: score >= 70 ? '건강 관리에 좋은 날씨입니다' :
                score >= 40 ? '옷차림에 신경쓰세요' :
                    '감기 조심하세요. 보온에 유의하세요'
        };
    }

    /**
     * 점수를 등급으로 변환
     */
    static getGrade(score) {
        if (score >= 80) return '매우 좋음';
        if (score >= 60) return '좋음';
        if (score >= 40) return '보통';
        if (score >= 20) return '나쁨';
        return '매우 나쁨';
    }

    /**
     * 점수에 따른 색상
     */
    static getColor(score) {
        if (score >= 80) return '#4CAF50'; // 녹색
        if (score >= 60) return '#8BC34A'; // 연두
        if (score >= 40) return '#FFC107'; // 노랑
        if (score >= 20) return '#FF9800'; // 주황
        return '#F44336'; // 빨강
    }

    /**
     * 점수에 따른 설명
     */
    static getDescription(score, activity) {
        if (score >= 80) return `${activity}에 매우 좋습니다`;
        if (score >= 60) return `${activity}에 좋습니다`;
        if (score >= 40) return `${activity}에 보통입니다`;
        if (score >= 20) return `${activity}에 좋지 않습니다`;
        return `${activity}에 매우 좋지 않습니다`;
    }
}
