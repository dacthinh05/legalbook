'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Building,
  User,
} from 'lucide-react';
import {
  cn,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_ABBREV,
  DOCUMENT_TYPE_COLORS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  getEffectiveStatus,
  formatDate,
} from '@/lib/utils';
import type { LegalDocument, DocumentRelation } from '@/types';
import { DEMO_DOCUMENTS, DEMO_RELATIONS } from '@/lib/demo-data';

export interface LegalRelationshipGraphModalProps {
  document: LegalDocument;
  allDocuments?: LegalDocument[];
  onClose: () => void;
  onSelectDocument: (id: string) => void;
}

interface GraphNode {
  id: string;
  doc: LegalDocument;
  x: number;
  y: number;
  type: 'root' | 'upstream' | 'downstream' | 'modifier';
  relationType: string;
  relationLabel: string;
  notes?: string;
}

interface GraphEdge {
  from: GraphNode;
  to: GraphNode;
  relationType: string;
  relationLabel: string;
  isModifier?: boolean;
}

export function LegalRelationshipGraphModal({
  document: rootDoc,
  allDocuments = DEMO_DOCUMENTS as unknown as LegalDocument[],
  onClose,
  onSelectDocument,
}: LegalRelationshipGraphModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterRelation, setFilterRelation] = useState<'all' | 'can_cu' | 'huong_dan' | 'sua_doi'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Build Graph Nodes & Edges layout
  const { nodes, edges, rootNode } = useMemo(() => {
    const docMap = new Map<string, LegalDocument>(allDocuments.map((d) => [d.id, d]));
    
    // Central Root Node
    const centerNode: GraphNode = {
      id: rootDoc.id,
      doc: rootDoc,
      x: 450,
      y: 300,
      type: 'root',
      relationType: 'root',
      relationLabel: 'Văn bản đang xem',
    };

    const gNodes: GraphNode[] = [centerNode];
    const gEdges: GraphEdge[] = [];

    // Find upstream (where root is source -> targets are Laws/Parent Decrees)
    const upstreamRels = DEMO_RELATIONS.filter((r) => r.source_document_id === rootDoc.id);
    const upstreamDocs: Array<{ doc: LegalDocument; rel: DocumentRelation }> = [];
    upstreamRels.forEach((r) => {
      const target = docMap.get(r.target_document_id);
      if (target) upstreamDocs.push({ doc: target, rel: r });
    });

    // Find downstream (where root is target -> sources are Guiding Decrees/Circulars/Dispatches)
    const downstreamRels = DEMO_RELATIONS.filter((r) => r.target_document_id === rootDoc.id);
    const downstreamDocs: Array<{ doc: LegalDocument; rel: DocumentRelation }> = [];
    downstreamRels.forEach((r) => {
      const source = docMap.get(r.source_document_id);
      if (source) downstreamDocs.push({ doc: source, rel: r });
    });

    // Layout Upstream Nodes (Top arc / Row above)
    const upCount = upstreamDocs.length;
    upstreamDocs.forEach(({ doc, rel }, idx) => {
      const spacing = 220;
      const startX = centerNode.x - ((upCount - 1) * spacing) / 2;
      const x = upCount === 1 ? centerNode.x : startX + idx * spacing;
      const y = centerNode.y - 180;

      const node: GraphNode = {
        id: doc.id,
        doc,
        x,
        y,
        type: 'upstream',
        relationType: rel.relation_type,
        relationLabel: rel.relation_type === 'can_cu' ? 'Căn cứ ban hành' : 'Văn bản gốc',
        notes: 'notes' in rel && typeof rel.notes === 'string' ? rel.notes : undefined,
      };
      gNodes.push(node);
      gEdges.push({
        from: node,
        to: centerNode,
        relationType: rel.relation_type,
        relationLabel: node.relationLabel,
      });
    });

    // Layout Downstream Nodes (Bottom arc / Row below)
    const downCount = downstreamDocs.length;
    downstreamDocs.forEach(({ doc, rel }, idx) => {
      const isMod = rel.relation_type === 'sua_doi' || rel.relation_type === 'thay_the';
      const spacing = 210;
      const startX = centerNode.x - ((downCount - 1) * spacing) / 2;
      const x = downCount === 1 ? centerNode.x : startX + idx * spacing;
      const y = centerNode.y + 190;

      const relLabel = isMod
        ? rel.relation_type === 'thay_the'
          ? 'Thay thế văn bản này'
          : 'Sửa đổi, bổ sung'
        : doc.document_type === 'cong_van'
        ? 'Công văn giải đáp'
        : doc.document_type === 'thong_tu'
        ? 'Thông tư quy định chi tiết'
        : 'Nghị định hướng dẫn';

      const node: GraphNode = {
        id: doc.id,
        doc,
        x,
        y,
        type: isMod ? 'modifier' : 'downstream',
        relationType: rel.relation_type,
        relationLabel: relLabel,
        notes: 'notes' in rel && typeof rel.notes === 'string' ? rel.notes : undefined,
      };
      gNodes.push(node);
      gEdges.push({
        from: centerNode,
        to: node,
        relationType: rel.relation_type,
        relationLabel: relLabel,
        isModifier: isMod,
      });
    });

    return { nodes: gNodes, edges: gEdges, rootNode: centerNode };
  }, [rootDoc, allDocuments]);

  // Filtered nodes and edges
  const filteredNodes = useMemo(() => {
    if (filterRelation === 'all') return nodes;
    return nodes.filter(
      (n) => n.type === 'root' || (filterRelation === 'can_cu' && n.type === 'upstream') || (filterRelation === 'huong_dan' && n.type === 'downstream') || (filterRelation === 'sua_doi' && n.type === 'modifier')
    );
  }, [nodes, filterRelation]);

  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => visibleNodeIds.has(e.from.id) && visibleNodeIds.has(e.to.id));
  }, [edges, filteredNodes]);

  // Pan and drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.graph-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Đồ thị liên kết văn bản pháp luật 2D"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col focus:outline-none transition-all',
          isFullscreen
            ? 'fixed inset-2 z-50'
            : 'w-full max-w-6xl h-[88vh] max-h-[860px]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. HEADER ── */}
        <div className="h-14 px-4 sm:px-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white tracking-tight truncate">
                  Đồ thị Quan hệ Pháp lý 2D
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {nodes.length} văn bản liên kết
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                Gốc: <span className="font-semibold text-slate-200">{rootDoc.document_number}</span> — {rootDoc.title}
              </p>
            </div>
          </div>

          {/* Filter Pills & Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Filter Pills */}
            <div className="hidden md:flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'can_cu', label: 'Căn cứ ban hành' },
                  { id: 'huong_dan', label: 'Hướng dẫn / Thi hành' },
                  { id: 'sua_doi', label: 'Sửa đổi / Thay thế' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterRelation(f.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                    filterRelation === f.id
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-slate-300">
              <button
                onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                title="Phóng to (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                title="Thu nhỏ (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                title="Đặt lại góc nhìn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 rounded-lg border border-slate-700 transition-colors ml-1"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 2. GRAPH CANVAS WORKSPACE ── */}
        <div className="flex-1 relative overflow-hidden bg-slate-950 flex">
          {/* Main SVG/Canvas Surface */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={cn(
              'flex-1 h-full relative overflow-hidden cursor-grab select-none',
              isDragging && 'cursor-grabbing'
            )}
          >
            {/* Background Grid Pattern */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px)`,
                backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`,
              }}
            />

            {/* SVG Elements Layer */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              <defs>
                {/* Arrow markers */}
                <marker
                  id="arrow-upstream"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
                <marker
                  id="arrow-downstream"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
                <marker
                  id="arrow-modifier"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                </marker>
              </defs>

              {/* Render Edges / Curved Connection Lines */}
              {filteredEdges.map((edge, idx) => {
                const isUp = edge.from.type === 'upstream';
                const isMod = edge.isModifier;
                const strokeColor = isMod ? '#f59e0b' : isUp ? '#3b82f6' : '#10b981';
                const markerId = isMod ? 'url(#arrow-modifier)' : isUp ? 'url(#arrow-upstream)' : 'url(#arrow-downstream)';
                
                // Curve calculation
                const dx = edge.to.x - edge.from.x;
                const dy = edge.to.y - edge.from.y;
                const cx1 = edge.from.x;
                const cy1 = edge.from.y + dy * 0.5;
                const cx2 = edge.to.x;
                const cy2 = edge.to.y - dy * 0.5;

                return (
                  <g key={idx}>
                    <path
                      d={`M ${edge.from.x} ${edge.from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${edge.to.x} ${edge.to.y}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isMod ? 2 : 1.75}
                      strokeDasharray={isMod ? '4 3' : undefined}
                      markerEnd={markerId}
                      opacity={0.65}
                    />
                    {/* Edge Label on midpoint */}
                    <text
                      x={(edge.from.x + edge.to.x) / 2}
                      y={(edge.from.y + edge.to.y) / 2 - 6}
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      className="select-none"
                    >
                      {edge.relationLabel}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Interactive HTML Nodes Layer */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {filteredNodes.map((node) => {
                const isRoot = node.type === 'root';
                const isSelected = selectedNode?.id === node.id;
                const effStatus = getEffectiveStatus(node.doc);

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={cn(
                      'graph-node absolute pointer-events-auto cursor-pointer rounded-xl p-3 transition-all select-none',
                      isRoot
                        ? 'w-64 bg-slate-900 border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.35)] ring-4 ring-blue-500/20'
                        : 'w-56 bg-slate-900/90 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 shadow-lg',
                      isSelected && !isRoot && 'ring-2 ring-amber-400 border-amber-400 shadow-xl scale-105'
                    )}
                  >
                    {/* Header: DocType Tag + Number */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[9.5px] font-bold border uppercase tracking-wider shrink-0',
                          DOCUMENT_TYPE_COLORS[node.doc.document_type]
                        )}
                      >
                        {DOCUMENT_TYPE_ABBREV[node.doc.document_type] || node.doc.document_type}
                      </span>
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {node.doc.document_number}
                      </span>
                      {isRoot && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          GỐC
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-[11.5px] font-semibold text-slate-200 line-clamp-2 leading-tight mb-1">
                      {node.doc.title}
                    </h4>

                    {/* Footer: Status & Issuer */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      <span className="truncate max-w-[110px]">{node.doc.issuing_body}</span>
                      <span className={cn('px-1 py-0.2 rounded border text-[9.5px] font-semibold', DOCUMENT_STATUS_COLORS[effStatus])}>
                        {DOCUMENT_STATUS_LABELS[effStatus]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 3. RIGHT INSPECTOR PANEL (When Node Selected) ── */}
          {selectedNode && (
            <div className="w-80 border-l border-slate-800 bg-slate-900/95 p-4 overflow-y-auto flex flex-col gap-3.5 shrink-0 animate-in slide-in-from-right-3 duration-150 select-text">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Chi tiết văn bản liên kết
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Document Identity */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded text-[10px] font-bold border uppercase',
                      DOCUMENT_TYPE_COLORS[selectedNode.doc.document_type]
                    )}
                  >
                    {DOCUMENT_TYPE_LABELS[selectedNode.doc.document_type]}
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    {selectedNode.doc.document_number}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 leading-snug">
                  {selectedNode.doc.title}
                </h4>
              </div>

              {/* Relationship Reason */}
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3 h-3" /> Quan hệ pháp lý
                </span>
                <p className="text-xs font-semibold text-white">
                  {selectedNode.relationLabel}
                </p>
                {selectedNode.notes && (
                  <p className="text-[11px] text-slate-300 leading-relaxed italic">
                    {selectedNode.notes}
                  </p>
                )}
              </div>

              {/* Metadata details */}
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Cơ quan: <strong className="text-white">{selectedNode.doc.issuing_body}</strong></span>
                </div>
                {selectedNode.doc.signer && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Người ký: <strong className="text-white">{selectedNode.doc.signer}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Ban hành: <strong className="text-white">{formatDate(selectedNode.doc.issued_date)}</strong></span>
                </div>
                {selectedNode.doc.effective_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Hiệu lực: <strong className="text-white">{formatDate(selectedNode.doc.effective_date)}</strong></span>
                  </div>
                )}
              </div>

              {/* Summary */}
              {selectedNode.doc.summary_main && (
                <div className="space-y-1 pt-1 border-t border-slate-800 text-xs">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase">Tóm tắt nội dung:</span>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    {selectedNode.doc.summary_main}
                  </p>
                </div>
              )}

              {/* Action: Open Document */}
              <div className="pt-2 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    onSelectDocument(selectedNode.doc.id);
                    onClose();
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Mở đọc văn bản này</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
