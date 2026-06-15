import { useState } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { WebView } from 'react-native-webview'
import { colors } from '../theme'

// 지도 렌더:
//  1) EXPO_PUBLIC_KAKAO_JS_KEY 있으면 → Kakao JS SDK(WebView): 번호 마커 + 경로선 (Expo Go에서도 동작, 웹 도메인 등록 필요)
//  2) 없으면 → 플레이스홀더(앱은 정상 동작; 경유지 수 표시)
// 네이티브 지도(@react-native-kakao/map)는 RN 0.85(Expo SDK 56) 미지원/미유지보수로 제거 → WebView 방식으로 일원화.
const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? ''
// Kakao JS SDK는 등록된 웹 플랫폼 도메인에서만 동작 → WebView baseUrl을 등록 도메인으로 맞춘다.
const MAP_DOMAIN = process.env.EXPO_PUBLIC_KAKAO_MAP_DOMAIN ?? 'https://travelpack.app'
export const MAP_ENABLED = Boolean(KAKAO_JS_KEY)

export interface MapMarker { lat: number; lng: number; label?: string; done?: boolean }

interface Props {
  lat: number
  lng: number
  markers?: MapMarker[]
  zoomLevel?: number
  height?: number
  style?: ViewStyle
}

export function MapView({ lat, lng, markers, zoomLevel = 5, height = 200, style }: Props) {
  if (KAKAO_JS_KEY) {
    return (
      <View style={[{ height, borderRadius: 12, overflow: 'hidden' }, style]}>
        <WebMap lat={lat} lng={lng} markers={markers} level={zoomLevel} height={height} />
      </View>
    )
  }
  return <Placeholder height={height} markers={markers} style={style} />
}

// ── Kakao JS SDK (WebView): 번호 마커 + 경로선 ─────────────────────
function WebMap({ lat, lng, markers, level, height }: { lat: number; lng: number; markers?: MapMarker[]; level: number; height: number }) {
  const [failed, setFailed] = useState(false)
  const pts = markers && markers.length > 0 ? markers : [{ lat, lng }]
  const html = buildHtml(lat, lng, level, pts)

  if (failed) return <Placeholder height={height} markers={markers} />
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: MAP_DOMAIN }}
      style={{ flex: 1, backgroundColor: colors.bg2 }}
      scrollEnabled={false}
      javaScriptEnabled
      domStorageEnabled
      onError={() => setFailed(true)}
      onHttpError={() => setFailed(true)}
    />
  )
}

function buildHtml(lat: number, lng: number, level: number, pts: MapMarker[]): string {
  const data = JSON.stringify(pts.map((p) => ({ lat: p.lat, lng: p.lng, done: Boolean(p.done) })))
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#F7F7F9}
  .num{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;
       background:#FF6B35;color:#fff;font:700 12px/1 -apple-system,sans-serif;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)}
  .num.done{background:#12B76A}
</style></head><body><div id="map"></div>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"></script>
<script>
  try{
    kakao.maps.load(function(){
      var pts=${data};
      var map=new kakao.maps.Map(document.getElementById('map'),{center:new kakao.maps.LatLng(${lat},${lng}),level:${level}});
      var path=[],bounds=new kakao.maps.LatLngBounds();
      pts.forEach(function(p,i){
        var pos=new kakao.maps.LatLng(p.lat,p.lng);path.push(pos);bounds.extend(pos);
        var el=document.createElement('div');el.className='num'+(p.done?' done':'');el.textContent=(i+1);
        new kakao.maps.CustomOverlay({position:pos,content:el,yAnchor:0.5}).setMap(map);
      });
      if(pts.length>1){
        new kakao.maps.Polyline({path:path,strokeWeight:4,strokeColor:'#FF6B35',strokeOpacity:0.9,strokeStyle:'solid'}).setMap(map);
        map.setBounds(bounds);
      }
    });
  }catch(e){document.body.innerHTML='<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#8B95A1">지도를 불러올 수 없어요</div>';}
</script></body></html>`
}

function Placeholder({ height, markers, style }: { height: number; markers?: MapMarker[]; style?: ViewStyle }) {
  const done = markers?.filter((m) => m.done).length ?? 0
  return (
    <View style={[styles.ph, { height }, style]}>
      <Text style={styles.phText}>지도</Text>
      {markers && markers.length > 0 && (
        <Text style={styles.phSub}>경유지 {markers.length}곳{done ? ` · ${done} 완료` : ''}</Text>
      )}
      {!MAP_ENABLED && <Text style={styles.phHint}>카카오 지도 키 설정 시 지도 표시</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  ph: { backgroundColor: colors.bg2, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  phText: { color: colors.textSub, fontWeight: '600' },
  phSub: { color: colors.textHint, fontSize: 12 },
  phHint: { color: colors.textHint, fontSize: 11 },
})
