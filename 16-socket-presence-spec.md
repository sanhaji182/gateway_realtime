# 16 – Socket Presence Spec

## Purpose
Mendefinisikan perilaku presence channel seperti Pusher: member list, member count, join/leave events.

## Presence Channel Rules
- Prefix `presence-` wajib.
- Wajib auth.
- Harus mengirim `channel_data` saat join.
- Server menyimpan member state hanya di memory.

---

## Member Object
```json
{
  "user_id": "u-881",
  "user_info": {
    "name": "San Haji",
    "avatar": "https://...",
    "role": "admin"
  }
}
```

---

## Events

| Event | Kapan |
|------|-------|
| `member_added` | user baru join room |
| `member_removed` | user leave / disconnect |
| `subscription_succeeded` | subscribe presence berhasil |
| `subscription_error` | auth gagal / permission ditolak |

### Client Example
```js
const room = gw.subscribe('presence-room.1')

room.on('subscription_succeeded', ({ members, count }) => {
  renderMembers(members)
  updateCount(count)
})

room.on('member_added', (member) => addMember(member))
room.on('member_removed', (member) => removeMember(member.user_id))
```

---

## Presence Lifecycle
1. Client subscribe presence channel.
2. Auth endpoint returns signature + `channel_data`.
3. Gateway menambahkan member ke room state.
4. Gateway mengirim `subscription_succeeded` berisi member list awal.
5. Saat ada user join/leave, gateway broadcast event ke semua member.
6. Saat socket disconnect, member otomatis dihapus setelah timeout/heartbeat fail.

---

## Member Count Rules
- Count harus akurat terhadap member aktif di room.
- Bila user memiliki multi-tab, boleh dihitung sebagai 1 atau per-socket — pilih satu dan konsisten.
- Rekomendasi untuk V1: per-socket count, karena implementasi lebih sederhana.

---

## UI Usage
Presence channel dipakai untuk:
- status online user chat,
- jumlah penonton room,
- collaborator indicator di future version.

Untuk dashboard admin, tampilkan:
- member count,
- list member,
- join/leave activity timeline.

---

## Timeout / Cleanup
- Jika heartbeat gagal 2 kali berturut-turut, member dianggap offline.
- Broadcast `member_removed` saat cleanup.
- Jangan simpan history presence ke database di V1.
