import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
export const formatDate     = (d?: string | null) => d ? dayjs(d).format('DD MMM YYYY') : '—'
export const formatDateTime = (d?: string | null) => d ? dayjs(d).format('DD MMM YYYY, HH:mm') : '—'
export const formatTime     = (d?: string | null) => d ? dayjs(d).format('HH:mm') : '—'
export const fromNow        = (d?: string | null) => d ? dayjs(d).fromNow() : '—'
export const toApiDate      = (d: Date | string)  => dayjs(d).format('YYYY-MM-DD')
