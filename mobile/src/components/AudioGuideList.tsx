import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { colors, radius, space } from '../theme'
import type { AudioGuide } from '../api/types'

function fmt(sec: number | null): string {
  if (!sec || sec <= 0) return ''
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function AudioGuideList({ guides }: { guides: AudioGuide[] }) {
  const player = useAudioPlayer(null)
  const status = useAudioPlayerStatus(player)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openScript, setOpenScript] = useState<string | null>(null)

  if (guides.length === 0) return null

  function toggle(g: AudioGuide) {
    if (!g.audioUrl) return
    if (activeId === g.id) {
      if (status.playing) player.pause()
      else player.play()
      return
    }
    player.replace(g.audioUrl)
    player.play()
    setActiveId(g.id)
  }

  return (
    <View style={{ gap: space(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="headset-outline" size={16} color={colors.primary} />
        <Text style={styles.section}>오디오 가이드</Text>
        <Text style={styles.src}>한국관광공사 오디</Text>
      </View>

      {guides.map((g) => {
        const isActive = activeId === g.id
        const playing = isActive && status.playing
        return (
          <View key={g.id} style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {g.audioUrl ? (
                <Pressable onPress={() => toggle(g)} style={styles.playBtn} hitSlop={6}>
                  <Ionicons name={playing ? 'pause' : 'play'} size={18} color={colors.white} />
                </Pressable>
              ) : (
                <View style={[styles.playBtn, { backgroundColor: colors.bg2 }]}>
                  <Ionicons name="document-text-outline" size={16} color={colors.textHint} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{g.audioTitle || g.title}</Text>
                <Text style={styles.meta}>
                  {g.audioUrl ? `오디오${g.playTime ? ` · ${fmt(g.playTime)}` : ''}` : '대본'}
                  {g.script ? '' : ''}
                </Text>
              </View>
              {g.script && (
                <Pressable onPress={() => setOpenScript(openScript === g.id ? null : g.id)} hitSlop={6}>
                  <Ionicons name={openScript === g.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textHint} />
                </Pressable>
              )}
            </View>
            {isActive && status.duration > 0 && (
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(100, (status.currentTime / status.duration) * 100)}%` }]} />
              </View>
            )}
            {openScript === g.id && g.script && <Text style={styles.script}>{g.script}</Text>}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '600', color: colors.text },
  src: { fontSize: 11, color: colors.textHint, marginLeft: 'auto' },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, padding: space(3), gap: space(2) },
  playBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '500', color: colors.text },
  meta: { fontSize: 12, color: colors.textHint, marginTop: 2 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.bg2, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.primary },
  script: { fontSize: 13, color: colors.textSub, lineHeight: 20, paddingTop: 4 },
})
