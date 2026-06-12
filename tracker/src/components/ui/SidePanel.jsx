import styles from './SidePanel.module.css'

export default function SidePanel({ open, onClose, title, children }) {
  if (!open) return null

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <aside className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </aside>
    </>
  )
}
