import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeedback } from '../components/ui/Feedback'

// BrowserRouter has no navigation blocker, so in-app link clicks are intercepted
// in the capture phase (before React Router sees them) while the form is dirty.
export default function useUnsavedWarning(dirty, options = {}) {
  const navigate = useNavigate()
  const { confirm } = useFeedback()
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = async (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = e.target.closest && e.target.closest('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const to = url.pathname + url.search + url.hash
      if (to === window.location.pathname + window.location.search + window.location.hash) return
      e.preventDefault()
      e.stopPropagation()
      const ok = await confirm({
        title: optionsRef.current.title || 'Leave without submitting?',
        message: optionsRef.current.message || 'You have unsaved changes on this page. If you leave now, they will be lost.',
        confirmLabel: 'Leave page',
        cancelLabel: 'Stay on page',
        tone: 'danger',
        icon: 'alert',
      })
      if (ok) {
        optionsRef.current.onDiscard?.()
        navigate(to)
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty, confirm, navigate])
}
