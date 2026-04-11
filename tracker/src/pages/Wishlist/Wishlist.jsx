import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { apiFetch } from '../../api/http.js'
import { getSetting, putSetting } from '../../api/settingsClient.js'
import { settingsLoadErrorHint } from '../../constants/settingsUi.js'
import { notifySuccess } from '../../utils/successNotify.js'
import SettingsPageLayout from '../../components/SettingsPageLayout/SettingsPageLayout.jsx'
import f from '../../styles/forms.module.css'
import s from './Wishlist.module.css'

const LEGACY_STORAGE_KEY = 'tracker-wishlist-v1'

function sortWishlistByBought(items) {
  const unbought = []
  const bought = []
  for (const it of items) {
    if (it.bought) bought.push(it)
    else unbought.push(it)
  }
  return [...unbought, ...bought]
}

function normalizeList(arr) {
  if (!Array.isArray(arr)) return []
  const mapped = arr
    .filter((x) => x && typeof x.label === 'string')
    .map((x) => ({
      id: x.id || crypto.randomUUID(),
      label: x.label,
      bought: Boolean(x.bought),
    }))
  return sortWishlistByBought(mapped)
}

function normalizeWishlist(data) {
  if (typeof data !== 'object' || data === null)
    return { personal: [], home: [] }
  return {
    personal: normalizeList(data.personal),
    home: normalizeList(data.home),
  }
}

function loadLegacyWishlist() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    return normalizeWishlist(JSON.parse(raw))
  } catch {
    return null
  }
}

function isWishlistEmpty(w) {
  const n = normalizeWishlist(w)
  return n.personal.length === 0 && n.home.length === 0
}

function parseTxtToProductLines(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export default function WishlistPage() {
  const [data, setData] = useState(() => ({ personal: [], home: [] }))
  const [ready, setReady] = useState(false)
  const [persistOk, setPersistOk] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let remote = await getSetting('wishlist')
        if (cancelled) return
        if (isWishlistEmpty(remote)) {
          const legacyData = loadLegacyWishlist()
          if (legacyData && !isWishlistEmpty(legacyData)) {
            await putSetting('wishlist', legacyData)
            localStorage.removeItem(LEGACY_STORAGE_KEY)
            remote = legacyData
          }
        }
        setData(normalizeWishlist(remote))
        setLoadError('')
        setPersistOk(true)
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            (e.message || 'No se pudo cargar desde el servidor') +
              settingsLoadErrorHint
          )
          setData({ personal: [], home: [] })
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !persistOk) return
    const t = setTimeout(() => {
      putSetting('wishlist', data)
        .then(() => setSyncError(''))
        .catch((e) => {
          setSyncError(e.message || 'Error al guardar')
        })
    }, 400)
    return () => clearTimeout(t)
  }, [data, ready, persistOk])

  function setPersonal(next) {
    setData((d) => ({
      ...d,
      personal: typeof next === 'function' ? next(d.personal) : next,
    }))
  }

  function setHome(next) {
    setData((d) => ({
      ...d,
      home: typeof next === 'function' ? next(d.home) : next,
    }))
  }

  const errBanner = loadError || syncError

  return (
    <SettingsPageLayout
      title="Quiero comprar"
      ready={ready}
      errorMessage={errBanner}
    >
      <div className={s.wishlistTwoCols}>
        <SortableWishlist
          title="Personal"
          hint="Para ti: ropa, gadgets, hobbies…"
          items={data.personal}
          onItemsChange={setPersonal}
        />
        <SortableWishlist
          title="Casa"
          hint="Hogar: muebles, limpieza, decoración…"
          items={data.home}
          onItemsChange={setHome}
        />
      </div>
    </SettingsPageLayout>
  )
}

function SortableWishlist({ title, hint, items, onItemsChange }) {
  const [draft, setDraft] = useState('')
  const [aiMode, setAiMode] = useState(null)
  const [aiError, setAiError] = useState('')
  const fileInputRef = useRef(null)

  const boughtCount = useMemo(
    () => items.filter((i) => i.bought).length,
    [items]
  )
  const totalCount = items.length
  const unboughtItems = useMemo(
    () => items.filter((i) => !i.bought),
    [items]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onItemsChange((list) =>
      sortWishlistByBought(arrayMove(list, oldIndex, newIndex))
    )
  }

  function toggle(id) {
    onItemsChange((list) =>
      sortWishlistByBought(
        list.map((i) => (i.id === id ? { ...i, bought: !i.bought } : i))
      )
    )
  }

  function remove(id) {
    onItemsChange((list) => sortWishlistByBought(list.filter((i) => i.id !== id)))
  }

  function addItem(e) {
    e.preventDefault()
    const label = draft.trim()
    if (!label) return
    onItemsChange((list) =>
      sortWishlistByBought([
        ...list,
        { id: crypto.randomUUID(), label, bought: false },
      ])
    )
    setDraft('')
  }

  function handleImportTxt(e) {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const lines = parseTxtToProductLines(reader.result ?? '')
      if (lines.length === 0) {
        input.value = ''
        return
      }
      onItemsChange((list) =>
        sortWishlistByBought([
          ...list,
          ...lines.map((label) => ({
            id: crypto.randomUUID(),
            label,
            bought: false,
          })),
        ])
      )
      input.value = ''
    }
    reader.onerror = () => {
      input.value = ''
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function runAiSort(mode) {
    setAiError('')
    if (unboughtItems.length === 0) {
      setAiError('No hay productos sin marcar para ordenar.')
      return
    }
    setAiMode(mode)
    try {
      const res = await apiFetch('/api/wishlist/sort', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          items: unboughtItems.map(({ id, label }) => ({ id, label })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`)
      }
      const { order } = data
      if (!Array.isArray(order) || order.length !== unboughtItems.length) {
        throw new Error('La respuesta no tiene el mismo número de ítems.')
      }
      const allowed = new Set(unboughtItems.map((i) => i.id))
      for (const id of order) {
        if (!allowed.has(id)) {
          throw new Error('La IA omitió o inventó ids; no se aplicó el orden.')
        }
      }
      if (new Set(order).size !== order.length) {
        throw new Error('La IA repitió ids; no se aplicó el orden.')
      }

      const staleRef = { current: false }
      onItemsChange((list) => {
        const bought = list.filter((i) => i.bought)
        const unb = list.filter((i) => !i.bought)
        const idsSig = [...unb.map((i) => i.id)].sort().join('\0')
        const orderSig = [...order].sort().join('\0')
        if (idsSig !== orderSig) {
          staleRef.current = true
          return list
        }
        const mapNow = new Map(list.map((i) => [i.id, i]))
        const reordered = order.map((id) => mapNow.get(id))
        if (reordered.some((r) => !r || r.bought)) {
          staleRef.current = true
          return list
        }
        return sortWishlistByBought([...reordered, ...bought])
      })
      setTimeout(() => {
        if (staleRef.current) {
          setAiError(
            'La lista cambió mientras la IA respondía; inténtalo de nuevo.'
          )
          staleRef.current = false
        } else {
          notifySuccess('Se ha aplicado el orden correctamente.')
        }
      }, 0)
    } catch (e) {
      setAiError(e.message || 'No se pudo ordenar con la IA.')
    } finally {
      setAiMode(null)
    }
  }

  const ids = items.map((i) => i.id)
  const aiBusy = aiMode !== null

  return (
    <section className={s.wishBlock} aria-labelledby={`wish-title-${title}`}>
      <div className={s.wishBlockHead}>
        <h2 id={`wish-title-${title}`} className={s.wishBlockTitle}>
          {title}
        </h2>
        <span
          className={s.wishCounter}
          title="Marcadas / total (la IA no quita ítems; debe coincidir antes y después)"
        >
          {boughtCount}/{totalCount}
        </span>
      </div>
      <p className={s.wishBlockHint}>{hint}</p>

      <div className={s.wishAiRow}>
        <button
          type="button"
          className={s.btnAiSort}
          disabled={aiBusy || unboughtItems.length === 0}
          onClick={() => runAiSort('necessity')}
        >
          {aiMode === 'necessity' ? 'Ordenando…' : 'IA: más → menos necesario'}
        </button>
        <button
          type="button"
          className={s.btnAiSort}
          disabled={aiBusy || unboughtItems.length === 0}
          onClick={() => runAiSort('price')}
        >
          {aiMode === 'price' ? 'Ordenando…' : 'IA: más barato → más caro'}
        </button>
      </div>
      {aiError ? (
        <p className={s.wishAiError} role="alert">
          {aiError}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className={s.wishList} role="list">
            {items.length === 0 ? (
              <li className={s.wishEmpty}>Nada aún. Añade un producto abajo.</li>
            ) : (
              items.map((item) => (
                <SortableWishRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggle(item.id)}
                  onRemove={() => remove(item.id)}
                />
              ))
            )}
          </ul>
        </SortableContext>
      </DndContext>

      <div className={s.wishFooter}>
        <form className={s.wishAdd} onSubmit={addItem}>
          <input
            className={`${f.input} ${s.wishAddInput}`}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nombre del producto"
            autoComplete="off"
            aria-label="Nuevo producto"
          />
          <button
            type="submit"
            className={`${f.btnSubmit} ${f.btnSubmitInline}`}
          >
            Añadir
          </button>
        </form>
        <div className={s.wishImport}>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept=".txt,text/plain"
            aria-label={`Importar lista de productos desde archivo de texto en ${title}`}
            onChange={handleImportTxt}
          />
          <button
            type="button"
            className={s.btnImportTxt}
            onClick={() => fileInputRef.current?.click()}
          >
            Importar .txt
          </button>
          <p className={s.wishImportHint}>Una línea por producto.</p>
        </div>
      </div>
    </section>
  )
}

function SortableWishRow({ item, onToggle, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 2 : 0,
    opacity: isDragging ? 0.92 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${s.wishRow}${item.bought ? ` ${s.wishRowBought}` : ''}`}
    >
      <button
        type="button"
        className={s.wishRowHandle}
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
      >
        <span className={s.wishRowGrip} aria-hidden>
          ⋮⋮
        </span>
      </button>
      <label className={s.wishRowLabelWrap}>
        <input
          className={s.wishRowCheckbox}
          type="checkbox"
          checked={item.bought}
          onChange={onToggle}
        />
        <span className={s.wishRowText}>{item.label}</span>
      </label>
      <button
        type="button"
        className={`${f.btnRemove} ${f.btnRemoveTable} ${s.wishRowRemove}`}
        aria-label="Quitar de la lista"
        onClick={onRemove}
      >
        &times;
      </button>
    </li>
  )
}
