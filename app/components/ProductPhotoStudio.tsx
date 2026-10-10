'use client'

/**
 * Studio photo vendeur — éditeur d'images basé sur Canvas 2D natif.
 * Aucune dépendance externe : React 19 + Canvas API uniquement.
 *
 * Fonctionnalités :
 *  - Rotation 90° CW / CCW
 *  - Recadrage interactif (drag rectangle)
 *  - Flèches de dimensions (horizontale / verticale / libre) avec étiquette
 *  - Annotations texte libres
 *  - Déplacement des annotations à la souris ou au doigt
 *  - Choix de couleur et taille de police
 *  - Annulation / rétablissement (undo / redo)
 *  - Export WebP (défaut) ou PNG
 *  - Interface mobile-first (pointer events)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    X, RotateCcw, RotateCw, Undo2, Redo2, Crop, ArrowLeftRight,
    ArrowUpDown, Type, Trash2, Download, ZoomIn, Move, Check
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Unit = 'mm' | 'cm' | 'm'

export type Annotation = {
    id: string
    type: 'dimension' | 'text' | 'arrow'
    /** Normalized image coords (0..1). */
    x1: number; y1: number
    x2: number; y2: number
    label: string
    unit?: Unit
    color: string
    fontSize: number  // in canvas px (scaled on export)
    selected?: boolean
}

export type StudioState = {
    rotation: number           // 0 | 90 | 180 | 270
    cropApplied: boolean
    cropRect?: { x: number; y: number; w: number; h: number }  // normalized
    annotations: Annotation[]
}

export interface ProductPhotoStudioProps {
    file: File
    onExport: (file: File, studioState: StudioState) => void
    onClose: () => void
}

type Tool = 'select' | 'dimension_h' | 'dimension_v' | 'dimension_free' | 'text' | 'crop'

// ─── Constants ────────────────────────────────────────────────────────────────

const ARROW_HEAD = 10
const TICK_SIZE = 12
const COLORS = ['#FF5722', '#2196F3', '#4CAF50', '#FFEB3B', '#9C27B0', '#000000', '#FFFFFF']
const FONT_SIZES = [14, 18, 24, 32]
const HIT_RADIUS = 20  // px for annotation selection

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
    return Math.random().toString(36).slice(2, 9)
}

function dist(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v))
}

/** Image-relative (0..1) → canvas px rect */
function imgToCanvas(nx: number, ny: number, rect: ImageRect): [number, number] {
    return [rect.x + nx * rect.w, rect.y + ny * rect.h]
}

/** Canvas px → image-relative (0..1) */
function canvasToImg(cx: number, cy: number, rect: ImageRect): [number, number] {
    return [(cx - rect.x) / rect.w, (cy - rect.y) / rect.h]
}

type ImageRect = { x: number; y: number; w: number; h: number }

function getImageRect(
    imgW: number, imgH: number,
    canvasW: number, canvasH: number,
    rotation: number
): ImageRect {
    const swap = rotation === 90 || rotation === 270
    const dispW = swap ? imgH : imgW
    const dispH = swap ? imgW : imgH
    const scale = Math.min((canvasW * 0.98) / dispW, (canvasH * 0.98) / dispH)
    const w = dispW * scale
    const h = dispH * scale
    return { x: (canvasW - w) / 2, y: (canvasH - h) / 2, w, h }
}

// ─── Canvas drawing ───────────────────────────────────────────────────────────

function drawDimensionArrow(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number, x2: number, y2: number,
    label: string, color: string, fontSize: number
) {
    const len = dist(x1, y1, x2, y2)
    if (len < 5) return

    const angle = Math.atan2(y2 - y1, x2 - x1)
    const perpAngle = angle + Math.PI / 2

    ctx.save()
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    // Main line
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    // Arrow heads
    for (const [ax, ay, dir] of [[x1, y1, angle + Math.PI], [x2, y2, angle]] as [number, number, number][]) {
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax + Math.cos(dir + 0.4) * ARROW_HEAD, ay + Math.sin(dir + 0.4) * ARROW_HEAD)
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax + Math.cos(dir - 0.4) * ARROW_HEAD, ay + Math.sin(dir - 0.4) * ARROW_HEAD)
        ctx.stroke()
    }

    // End ticks
    for (const [tx, ty] of [[x1, y1], [x2, y2]] as [number, number][]) {
        ctx.beginPath()
        ctx.moveTo(tx + Math.cos(perpAngle) * TICK_SIZE / 2, ty + Math.sin(perpAngle) * TICK_SIZE / 2)
        ctx.lineTo(tx - Math.cos(perpAngle) * TICK_SIZE / 2, ty - Math.sin(perpAngle) * TICK_SIZE / 2)
        ctx.stroke()
    }

    // Label background + text
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    ctx.font = `bold ${fontSize}px sans-serif`
    const tw = ctx.measureText(label).width
    const th = fontSize
    const pad = 4

    // Rotate label along arrow
    ctx.save()
    ctx.translate(mx, my)
    ctx.rotate(angle)
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.beginPath()
    const rx = -tw / 2 - pad
    const ry = -th - pad - 6
    ctx.roundRect(rx, ry, tw + pad * 2, th + pad * 2, 4)
    ctx.fill()
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(label, 0, -6)
    ctx.restore()

    ctx.restore()
}

function drawTextAnnotation(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    label: string, color: string, fontSize: number
) {
    ctx.save()
    ctx.font = `bold ${fontSize}px sans-serif`
    const tw = ctx.measureText(label).width
    const pad = 6
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.beginPath()
    ctx.roundRect(x - pad, y - fontSize - pad, tw + pad * 2, fontSize + pad * 2, 4)
    ctx.fill()
    ctx.fillStyle = color
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(label, x, y)
    ctx.restore()
}

function drawSelectionHandle(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save()
    ctx.strokeStyle = '#FFEB3B'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
}

function drawAnnotations(
    ctx: CanvasRenderingContext2D,
    annotations: Annotation[],
    rect: ImageRect,
    selectedId?: string
) {
    for (const ann of annotations) {
        const [sx1, sy1] = imgToCanvas(ann.x1, ann.y1, rect)
        const [sx2, sy2] = imgToCanvas(ann.x2, ann.y2, rect)

        if (ann.type === 'text') {
            drawTextAnnotation(ctx, sx1, sy1, ann.label, ann.color, ann.fontSize)
        } else {
            drawDimensionArrow(ctx, sx1, sy1, sx2, sy2, ann.label, ann.color, ann.fontSize)
        }

        if (ann.id === selectedId) {
            drawSelectionHandle(ctx, sx1, sy1)
            if (ann.type !== 'text') drawSelectionHandle(ctx, sx2, sy2)
        }
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductPhotoStudio({ file, onExport, onClose }: ProductPhotoStudioProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)
    const rectRef = useRef<ImageRect>({ x: 0, y: 0, w: 1, h: 1 })

    const [rotation, setRotation] = useState(0)
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [history, setHistory] = useState<Annotation[][]>([[]])
    const [histIdx, setHistIdx] = useState(0)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [tool, setTool] = useState<Tool>('select')
    const [color, setColor] = useState('#FF5722')
    const [fontSize, setFontSize] = useState(18)
    const [unit, setUnit] = useState<Unit>('cm')
    const [exportFormat, setExportFormat] = useState<'webp' | 'png'>('webp')
    const [labelInput, setLabelInput] = useState('')
    const [showLabelDialog, setShowLabelDialog] = useState(false)
    const [pendingAnnotation, setPendingAnnotation] = useState<Omit<Annotation, 'label'> | null>(null)

    // Crop state
    const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
    const [showCropConfirm, setShowCropConfirm] = useState(false)

    // Pointer drag state
    const pointerState = useRef<{
        down: boolean
        startX: number; startY: number
        currentX: number; currentY: number
        dragAnnotationId?: string
        dragOffsetX?: number; dragOffsetY?: number
        draggingEndpoint?: 'p1' | 'p2'
    }>({ down: false, startX: 0, startY: 0, currentX: 0, currentY: 0 })

    // Load image once
    useEffect(() => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            imgRef.current = img
            redraw(img, rotation, annotations, selectedId ?? undefined)
        }
        img.src = url
        return () => URL.revokeObjectURL(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file])

    // Redraw on state changes
    useEffect(() => {
        if (imgRef.current) {
            redraw(imgRef.current, rotation, annotations, selectedId ?? undefined)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rotation, annotations, selectedId, cropRect])

    const redraw = useCallback((
        img: HTMLImageElement,
        rot: number,
        anns: Annotation[],
        selId?: string
    ) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const cssW = canvas.offsetWidth
        const cssH = canvas.offsetHeight
        canvas.width = cssW * dpr
        canvas.height = cssH * dpr
        ctx.scale(dpr, dpr)

        ctx.clearRect(0, 0, cssW, cssH)

        // Background
        ctx.fillStyle = '#1e1e2e'
        ctx.fillRect(0, 0, cssW, cssH)

        const rect = getImageRect(img.naturalWidth, img.naturalHeight, cssW, cssH, rot)
        rectRef.current = rect

        // Draw rotated image
        ctx.save()
        ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2)
        ctx.rotate((rot * Math.PI) / 180)
        const sw = (rot === 90 || rot === 270) ? rect.h : rect.w
        const sh = (rot === 90 || rot === 270) ? rect.w : rect.h
        ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh)
        ctx.restore()

        // Crop overlay
        if (tool === 'crop' && cropRect) {
            const [cx, cy] = imgToCanvas(cropRect.x, cropRect.y, rect)
            const cw = cropRect.w * rect.w
            const ch = cropRect.h * rect.h
            ctx.save()
            ctx.fillStyle = 'rgba(0,0,0,0.45)'
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
            ctx.clearRect(cx, cy, cw, ch)
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 2
            ctx.setLineDash([6, 3])
            ctx.strokeRect(cx, cy, cw, ch)
            ctx.restore()
        }

        drawAnnotations(ctx, anns, rect, selId)
    }, [tool, cropRect])

    // ── History ──

    function pushHistory(anns: Annotation[]) {
        const newHist = history.slice(0, histIdx + 1)
        newHist.push([...anns])
        setHistory(newHist)
        setHistIdx(newHist.length - 1)
    }

    function undo() {
        if (histIdx <= 0) return
        const newIdx = histIdx - 1
        setHistIdx(newIdx)
        setAnnotations([...history[newIdx]])
    }

    function redo() {
        if (histIdx >= history.length - 1) return
        const newIdx = histIdx + 1
        setHistIdx(newIdx)
        setAnnotations([...history[newIdx]])
    }

    // ── Rotation ──

    function rotate(dir: 'cw' | 'ccw') {
        setRotation(r => (r + (dir === 'cw' ? 90 : -90) + 360) % 360)
    }

    // ── Pointer events ──

    function getCanvasXY(e: React.PointerEvent): [number, number] {
        const canvas = canvasRef.current!
        const rect = canvas.getBoundingClientRect()
        return [e.clientX - rect.left, e.clientY - rect.top]
    }

    function findAnnotationAt(cx: number, cy: number): { id: string; endpoint: 'p1' | 'p2' | 'body' } | null {
        const rect = rectRef.current
        for (let i = annotations.length - 1; i >= 0; i--) {
            const ann = annotations[i]
            const [sx1, sy1] = imgToCanvas(ann.x1, ann.y1, rect)
            const [sx2, sy2] = imgToCanvas(ann.x2, ann.y2, rect)
            if (dist(cx, cy, sx1, sy1) < HIT_RADIUS) return { id: ann.id, endpoint: 'p1' }
            if (ann.type !== 'text' && dist(cx, cy, sx2, sy2) < HIT_RADIUS) return { id: ann.id, endpoint: 'p2' }
            // Check body (midpoint)
            const mx = (sx1 + sx2) / 2, my = (sy1 + sy2) / 2
            if (dist(cx, cy, mx, my) < HIT_RADIUS * 1.5) return { id: ann.id, endpoint: 'body' }
        }
        return null
    }

    function onPointerDown(e: React.PointerEvent) {
        e.currentTarget.setPointerCapture(e.pointerId)
        const [cx, cy] = getCanvasXY(e)
        pointerState.current = {
            down: true,
            startX: cx, startY: cy,
            currentX: cx, currentY: cy,
        }

        if (tool === 'select') {
            const hit = findAnnotationAt(cx, cy)
            if (hit) {
                setSelectedId(hit.id)
                const ann = annotations.find(a => a.id === hit.id)!
                const rect = rectRef.current
                const [sx1, sy1] = imgToCanvas(ann.x1, ann.y1, rect)
                const [sx2, sy2] = imgToCanvas(ann.x2, ann.y2, rect)
                pointerState.current.dragAnnotationId = hit.id
                pointerState.current.draggingEndpoint = hit.endpoint === 'body' ? undefined : hit.endpoint
                pointerState.current.dragOffsetX = hit.endpoint === 'p2' ? cx - sx2 : cx - sx1
                pointerState.current.dragOffsetY = hit.endpoint === 'p2' ? cy - sy2 : cy - sy1
            } else {
                setSelectedId(null)
            }
        }
    }

    function onPointerMove(e: React.PointerEvent) {
        if (!pointerState.current.down) return
        const [cx, cy] = getCanvasXY(e)
        pointerState.current.currentX = cx
        pointerState.current.currentY = cy

        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        const img = imgRef.current!
        const rect = rectRef.current

        if (tool === 'select' && pointerState.current.dragAnnotationId) {
            const id = pointerState.current.dragAnnotationId
            const ep = pointerState.current.draggingEndpoint
            const dx = pointerState.current.dragOffsetX ?? 0
            const dy = pointerState.current.dragOffsetY ?? 0
            const ax = cx - dx, ay = cy - dy

            setAnnotations(prev => prev.map(a => {
                if (a.id !== id) return a
                const [nx, ny] = canvasToImg(ax, ay, rect)
                if (ep === 'p1') return { ...a, x1: clamp(nx, 0, 1), y1: clamp(ny, 0, 1) }
                if (ep === 'p2') return { ...a, x2: clamp(nx, 0, 1), y2: clamp(ny, 0, 1) }
                // body → move both endpoints
                const [ox1, oy1] = imgToCanvas(a.x1, a.y1, rect)
                const [ox2, oy2] = imgToCanvas(a.x2, a.y2, rect)
                const ddx = ax - ox1 + dx, ddy = ay - oy1 + dy
                const [nx2, ny2] = canvasToImg(ox2 + ddx, oy2 + ddy, rect)
                return {
                    ...a,
                    x1: clamp(nx, 0, 1), y1: clamp(ny, 0, 1),
                    x2: clamp(nx2, 0, 1), y2: clamp(ny2, 0, 1)
                }
            }))
            return
        }

        if (tool === 'crop') {
            const sx = pointerState.current.startX
            const sy = pointerState.current.startY
            const [nx1, ny1] = canvasToImg(Math.min(sx, cx), Math.min(sy, cy), rect)
            const [nx2, ny2] = canvasToImg(Math.max(sx, cx), Math.max(sy, cy), rect)
            setCropRect({
                x: clamp(nx1, 0, 1), y: clamp(ny1, 0, 1),
                w: clamp(nx2 - nx1, 0, 1), h: clamp(ny2 - ny1, 0, 1),
            })
            return
        }

        if (tool.startsWith('dimension') || tool === 'text') {
            // Preview in-progress annotation
            const sx = pointerState.current.startX
            const sy = pointerState.current.startY
            const [nx1, ny1] = canvasToImg(sx, sy, rect)
            let [nx2, ny2] = canvasToImg(cx, cy, rect)

            if (tool === 'dimension_h') ny2 = ny1
            if (tool === 'dimension_v') nx2 = nx1

            const preview: Annotation = {
                id: '__preview__', type: tool === 'text' ? 'text' : 'dimension',
                x1: nx1, y1: ny1, x2: nx2, y2: ny2,
                label: '...', color, fontSize,
            }
            // Redraw with preview
            const dpr = window.devicePixelRatio || 1
            const cssW = canvas.offsetWidth
            const cssH = canvas.offsetHeight
            canvas.width = cssW * dpr
            canvas.height = cssH * dpr
            ctx.scale(dpr, dpr)
            ctx.fillStyle = '#1e1e2e'
            ctx.fillRect(0, 0, cssW, cssH)
            ctx.save()
            ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2)
            ctx.rotate((rotation * Math.PI) / 180)
            const sw = (rotation === 90 || rotation === 270) ? rect.h : rect.w
            const sh = (rotation === 90 || rotation === 270) ? rect.w : rect.h
            ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh)
            ctx.restore()
            drawAnnotations(ctx, annotations, rect, selectedId ?? undefined)
            drawAnnotations(ctx, [preview], rect)
        }
    }

    function onPointerUp(e: React.PointerEvent) {
        if (!pointerState.current.down) return
        const [cx, cy] = getCanvasXY(e)
        pointerState.current.down = false

        if (tool === 'select' && pointerState.current.dragAnnotationId) {
            pushHistory(annotations)
            pointerState.current.dragAnnotationId = undefined
            return
        }

        if (tool === 'crop') {
            if (cropRect && cropRect.w > 0.02 && cropRect.h > 0.02) {
                setShowCropConfirm(true)
            }
            return
        }

        if (tool.startsWith('dimension') || tool === 'text') {
            const rect = rectRef.current
            const sx = pointerState.current.startX, sy = pointerState.current.startY
            let [nx1, ny1] = canvasToImg(sx, sy, rect)
            let [nx2, ny2] = canvasToImg(cx, cy, rect)

            if (tool === 'dimension_h') ny2 = ny1
            if (tool === 'dimension_v') nx2 = nx1

            const isText = tool === 'text'
            if (!isText && dist(sx, sy, cx, cy) < 10) return  // too short

            const partial: Omit<Annotation, 'label'> = {
                id: uid(),
                type: isText ? 'text' : 'dimension',
                x1: clamp(nx1, 0, 1), y1: clamp(ny1, 0, 1),
                x2: clamp(nx2, 0, 1), y2: clamp(ny2, 0, 1),
                color, fontSize,
                unit: isText ? undefined : unit,
            }
            setPendingAnnotation(partial)
            setLabelInput('')
            setShowLabelDialog(true)
        }
    }

    function confirmLabel() {
        if (!pendingAnnotation || !labelInput.trim()) {
            setShowLabelDialog(false)
            return
        }
        const ann: Annotation = {
            ...pendingAnnotation,
            label: pendingAnnotation.type === 'dimension'
                ? `${labelInput.trim()} ${unit}`
                : labelInput.trim(),
        }
        const newAnns = [...annotations, ann]
        setAnnotations(newAnns)
        pushHistory(newAnns)
        setShowLabelDialog(false)
        setPendingAnnotation(null)
    }

    function deleteSelected() {
        if (!selectedId) return
        const newAnns = annotations.filter(a => a.id !== selectedId)
        setAnnotations(newAnns)
        pushHistory(newAnns)
        setSelectedId(null)
    }

    // ── Crop apply ──

    async function applyCrop() {
        if (!cropRect || !imgRef.current) return
        const img = imgRef.current
        const offscreen = document.createElement('canvas')

        // Natural size after rotation
        const natW = (rotation === 90 || rotation === 270) ? img.naturalHeight : img.naturalWidth
        const natH = (rotation === 90 || rotation === 270) ? img.naturalWidth : img.naturalHeight

        offscreen.width = Math.round(cropRect.w * natW)
        offscreen.height = Math.round(cropRect.h * natH)
        const octx = offscreen.getContext('2d')!
        octx.save()
        octx.translate(offscreen.width / 2, offscreen.height / 2)
        octx.rotate((rotation * Math.PI) / 180)
        const sx = cropRect.x * natW, sy = cropRect.y * natH
        octx.drawImage(img,
            sx - offscreen.width / 2 / (offscreen.width / natW),
            sy - offscreen.height / 2 / (offscreen.height / natH),
            img.naturalWidth, img.naturalHeight
        )
        octx.restore()

        offscreen.toBlob(blob => {
            if (!blob) return
            const newImg = new Image()
            newImg.onload = () => {
                imgRef.current = newImg
                setCropRect(null)
                setShowCropConfirm(false)
                setTool('select')
                setRotation(0)
                // Shift annotation coords into crop space
                setAnnotations(prev => prev.map(a => ({
                    ...a,
                    x1: (a.x1 - cropRect!.x) / cropRect!.w,
                    y1: (a.y1 - cropRect!.y) / cropRect!.h,
                    x2: (a.x2 - cropRect!.x) / cropRect!.w,
                    y2: (a.y2 - cropRect!.y) / cropRect!.h,
                })))
            }
            newImg.src = URL.createObjectURL(blob)
        }, 'image/png')
    }

    // ── Export ──

    function exportImage() {
        const img = imgRef.current
        if (!img) return

        const natW = (rotation === 90 || rotation === 270) ? img.naturalHeight : img.naturalWidth
        const natH = (rotation === 90 || rotation === 270) ? img.naturalWidth : img.naturalHeight

        const offscreen = document.createElement('canvas')
        offscreen.width = natW
        offscreen.height = natH
        const octx = offscreen.getContext('2d')!

        octx.save()
        octx.translate(natW / 2, natH / 2)
        octx.rotate((rotation * Math.PI) / 180)
        octx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
        octx.restore()

        // Draw annotations at native resolution
        const displayRect = rectRef.current
        const scaleX = natW / displayRect.w
        const scaleY = natH / displayRect.h
        const nativeRect: ImageRect = { x: 0, y: 0, w: natW, h: natH }

        for (const ann of annotations) {
            const [sx1, sy1] = imgToCanvas(ann.x1, ann.y1, nativeRect)
            const [sx2, sy2] = imgToCanvas(ann.x2, ann.y2, nativeRect)
            const scaledFont = ann.fontSize * Math.max(scaleX, scaleY) * 0.8
            if (ann.type === 'text') {
                drawTextAnnotation(octx, sx1, sy1, ann.label, ann.color, scaledFont)
            } else {
                drawDimensionArrow(octx, sx1, sy1, sx2, sy2, ann.label, ann.color, scaledFont)
            }
        }

        const mime = exportFormat === 'webp' ? 'image/webp' : 'image/png'
        const quality = exportFormat === 'webp' ? 0.85 : 1
        offscreen.toBlob(blob => {
            if (!blob) return
            const ext = exportFormat
            const baseName = file.name.replace(/\.[^.]+$/, '') || 'studio'
            const newFile = new File([blob], `${baseName}-studio.${ext}`, {
                type: mime,
                lastModified: Date.now(),
            })
            const studioState: StudioState = {
                rotation,
                cropApplied: false,
                annotations,
            }
            onExport(newFile, studioState)
        }, mime, quality)
    }

    // ─── Render ─────────────────────────────────────────────────────────────

    const toolBtnClass = (t: Tool) =>
        `flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition-all select-none ${
            tool === t
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700">
                        <X size={18} />
                    </button>
                    <span className="font-black uppercase text-sm text-white italic tracking-tight">Studio Photo</span>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={undo} disabled={histIdx <= 0} className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700">
                        <Undo2 size={16} />
                    </button>
                    <button onClick={redo} disabled={histIdx >= history.length - 1} className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center disabled:opacity-30 hover:bg-slate-700">
                        <Redo2 size={16} />
                    </button>
                    {selectedId && (
                        <button onClick={deleteSelected} className="w-9 h-9 rounded-xl bg-red-900 text-red-400 flex items-center justify-center hover:bg-red-800">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <button
                    onClick={exportImage}
                    className="px-4 py-2 rounded-xl bg-orange-500 text-white font-black text-sm uppercase flex items-center gap-2 hover:bg-orange-400"
                >
                    <Check size={16} />
                    Utiliser
                </button>
            </div>

            {/* ── Canvas area ── */}
            <div className="flex-1 relative overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full touch-none"
                    style={{ cursor: tool === 'select' ? 'default' : tool === 'crop' ? 'crosshair' : 'crosshair' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                />

                {/* Crop confirm overlay */}
                {showCropConfirm && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-slate-900 rounded-2xl p-3 shadow-xl border border-slate-700">
                        <button onClick={applyCrop} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-sm flex items-center gap-2">
                            <Check size={14} /> Recadrer
                        </button>
                        <button onClick={() => { setCropRect(null); setShowCropConfirm(false) }} className="px-5 py-2.5 bg-slate-700 text-slate-300 rounded-xl font-black text-sm">
                            Annuler
                        </button>
                    </div>
                )}
            </div>

            {/* ── Bottom toolbar ── */}
            <div className="shrink-0 bg-slate-900 border-t border-slate-800 px-3 py-3">
                {/* Tools row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button onClick={() => setTool('select')} className={toolBtnClass('select')}>
                        <Move size={18} />
                        <span>Déplacer</span>
                    </button>
                    <button onClick={() => setTool('crop')} className={toolBtnClass('crop')}>
                        <Crop size={18} />
                        <span>Recadrer</span>
                    </button>
                    <button onClick={() => rotate('ccw')} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-black bg-slate-800 text-slate-300 hover:bg-slate-700">
                        <RotateCcw size={18} />
                        <span>Gauche</span>
                    </button>
                    <button onClick={() => rotate('cw')} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-black bg-slate-800 text-slate-300 hover:bg-slate-700">
                        <RotateCw size={18} />
                        <span>Droite</span>
                    </button>
                    <button onClick={() => setTool('dimension_h')} className={toolBtnClass('dimension_h')}>
                        <ArrowLeftRight size={18} />
                        <span>Largeur</span>
                    </button>
                    <button onClick={() => setTool('dimension_v')} className={toolBtnClass('dimension_v')}>
                        <ArrowUpDown size={18} />
                        <span>Hauteur</span>
                    </button>
                    <button onClick={() => setTool('dimension_free')} className={toolBtnClass('dimension_free')}>
                        <ZoomIn size={18} />
                        <span>Mesure</span>
                    </button>
                    <button onClick={() => setTool('text')} className={toolBtnClass('text')}>
                        <Type size={18} />
                        <span>Texte</span>
                    </button>
                </div>

                {/* Options row */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {/* Color picker */}
                    <div className="flex items-center gap-1.5">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-slate-900 scale-110' : ''}`}
                                style={{ backgroundColor: c, border: c === '#FFFFFF' ? '1px solid #555' : undefined }}
                            />
                        ))}
                    </div>

                    {/* Font size */}
                    <select
                        value={fontSize}
                        onChange={e => setFontSize(Number(e.target.value))}
                        className="bg-slate-800 text-white text-xs font-black rounded-lg px-2 py-1.5 border border-slate-700"
                    >
                        {FONT_SIZES.map(s => (
                            <option key={s} value={s}>{s}px</option>
                        ))}
                    </select>

                    {/* Unit */}
                    {(tool.startsWith('dimension')) && (
                        <select
                            value={unit}
                            onChange={e => setUnit(e.target.value as Unit)}
                            className="bg-slate-800 text-white text-xs font-black rounded-lg px-2 py-1.5 border border-slate-700"
                        >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="m">m</option>
                        </select>
                    )}

                    {/* Export format */}
                    <div className="ml-auto flex items-center gap-1.5 text-xs font-black text-slate-400">
                        <button
                            onClick={() => setExportFormat('webp')}
                            className={`px-2.5 py-1 rounded-lg ${exportFormat === 'webp' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                        >WebP</button>
                        <button
                            onClick={() => setExportFormat('png')}
                            className={`px-2.5 py-1 rounded-lg ${exportFormat === 'png' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                        >PNG</button>
                    </div>
                </div>
            </div>

            {/* ── Label dialog ── */}
            {showLabelDialog && (
                <div className="fixed inset-0 z-60 flex items-end justify-center p-4 bg-black/60">
                    <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-5 border border-slate-700 space-y-4">
                        <p className="font-black text-white text-sm uppercase tracking-widest">
                            {pendingAnnotation?.type === 'text' ? 'Texte de l\'annotation' : `Mesure (${unit})`}
                        </p>
                        <input
                            type={pendingAnnotation?.type === 'text' ? 'text' : 'text'}
                            value={labelInput}
                            onChange={e => setLabelInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && confirmLabel()}
                            placeholder={pendingAnnotation?.type === 'text' ? 'Ex : Taille M / Matière : coton' : `Ex : 35 (en ${unit})`}
                            autoFocus
                            className="w-full bg-slate-800 text-white font-bold text-lg rounded-2xl px-4 py-3 border border-slate-600 outline-none focus:border-orange-500"
                        />
                        <div className="flex gap-3">
                            <button onClick={confirmLabel} className="flex-1 py-3 bg-orange-500 text-white font-black rounded-2xl uppercase text-sm">
                                Ajouter
                            </button>
                            <button onClick={() => setShowLabelDialog(false)} className="flex-1 py-3 bg-slate-700 text-slate-300 font-black rounded-2xl uppercase text-sm">
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
