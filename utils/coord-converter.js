/**
 * 기상청 격자 좌표 변환 유틸리티
 * 위경도 좌표를 기상청 단기예보 API에서 사용하는 격자(X, Y) 좌표로 변환
 * 기상청 공식 변환 알고리즘 적용
 */

class CoordConverter {
  constructor() {
    // 기상청 격자 변환 상수
    this.RE = 6371.00877; // 지구 반경(km)
    this.GRID = 5.0; // 격자 간격(km)
    this.SLAT1 = 30.0; // 표준위도 1
    this.SLAT2 = 60.0; // 표준위도 2
    this.OLON = 126.0; // 기준점 경도
    this.OLAT = 38.0; // 기준점 위도
    this.XO = 43; // 기준점 X좌표
    this.YO = 136; // 기준점 Y좌표
    
    this.DEGRAD = Math.PI / 180.0;
    this.RADDEG = 180.0 / Math.PI;
    
    const re = this.RE / this.GRID;
    const slat1 = this.SLAT1 * this.DEGRAD;
    const slat2 = this.SLAT2 * this.DEGRAD;
    const olon = this.OLON * this.DEGRAD;
    const olat = this.OLAT * this.DEGRAD;
    
    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);
    
    this.sn = sn;
    this.sf = sf;
    this.ro = ro;
  }
  
  /**
   * 위경도를 기상청 격자 좌표로 변환
   * @param {number} lat - 위도
   * @param {number} lon - 경도
   * @returns {{nx: number, ny: number}} 격자 X, Y 좌표
   */
  toGrid(lat, lon) {
    const ra = Math.tan(Math.PI * 0.25 + (lat * this.DEGRAD) * 0.5);
    const ro = this.RE / this.GRID * this.sf / Math.pow(ra, this.sn);
    let theta = lon * this.DEGRAD - this.OLON * this.DEGRAD;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= this.sn;
    
    const nx = Math.floor(ro * Math.sin(theta) + this.XO + 0.5);
    const ny = Math.floor(this.ro - ro * Math.cos(theta) + this.YO + 0.5);
    
    return { nx, ny };
  }
  
  /**
   * 기상청 격자 좌표를 위경도로 변환
   * @param {number} nx - 격자 X 좌표
   * @param {number} ny - 격자 Y 좌표
   * @returns {{lat: number, lon: number}} 위도, 경도
   */
  toLatLon(nx, ny) {
    const xn = nx - this.XO;
    const yn = this.ro - ny + this.YO;
    const ra = Math.sqrt(xn * xn + yn * yn);
    let alat, theta;
    
    if (this.sn > 0.0) {
      alat = Math.pow((this.RE / this.GRID * this.sf / ra), (1.0 / this.sn));
    } else {
      alat = -Math.pow((this.RE / this.GRID * this.sf / ra), (1.0 / this.sn));
    }
    
    alat = 2.0 * Math.atan(alat) - Math.PI * 0.5;
    
    if (Math.abs(xn) <= 0.0) {
      theta = 0.0;
    } else {
      if (Math.abs(yn) <= 0.0) {
        theta = Math.PI * 0.5;
        if (xn < 0.0) theta = -theta;
      } else {
        theta = Math.atan2(xn, yn);
      }
    }
    
    const alon = theta / this.sn + this.OLON * this.DEGRAD;
    const lat = alat * this.RADDEG;
    const lon = alon * this.RADDEG;
    
    return { lat, lon };
  }
}

// 싱글톤 인스턴스 생성
const coordConverter = new CoordConverter();

// 주요 도시 격자 좌표 매핑 (빠른 조회용)
const CITY_GRIDS = {
  '서울': { nx: 60, ny: 127 },
  '부산': { nx: 98, ny: 76 },
  '대구': { nx: 89, ny: 90 },
  '인천': { nx: 55, ny: 124 },
  '광주': { nx: 58, ny: 74 },
  '대전': { nx: 67, ny: 100 },
  '울산': { nx: 102, ny: 84 },
  '세종': { nx: 66, ny: 103 },
  '제주': { nx: 52, ny: 38 },
  '강릉': { nx: 92, ny: 131 },
  '전주': { nx: 63, ny: 89 },
  '천안': { nx: 68, ny: 107 },
  '청주': { nx: 69, ny: 106 },
  '포항': { nx: 102, ny: 94 },
  '여수': { nx: 73, ny: 66 }
};
