'use client';

import React, { useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  GitCompare,
  Columns2,
  ExternalLink,
  Layers,
  Info,
} from 'lucide-react';
import type { LegalDocument } from '@/types';
import { buildDocumentHierarchy, getTierForDocument, type HierarchyNode } from '@/lib/hierarchy';
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  getEffectiveStatus,
  formatDate,
} from '@/lib/utils';
import { LegalDiffViewer } from './LegalDiffViewer';
import { CrossDocAnalysisModal } from './CrossDocAnalysisModal';

interface LegalKnowledgeGraphProps {
  document: LegalDocument;
  onSelectDocument: (id: string) => void;
}

interface GraphNodeData {
  id: string;
  document: LegalDocument;
  tier: 1 | 2 | 3 | 4;
  relationNotes?: string;
  relationType?: string;
  x: number;
  y: number;
  isCurrent: boolean;
}

interface GraphEdgeData {
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  label?: string;
  type: string;
}

export function LegalKnowledgeGraph({
  document: doc,
  onSelectDocument,
}: LegalKnowledgeGraphProps) {
  const hierarchy = useMemo(() => buildDocumentHierarchy(doc.id), [doc.id]);
  const [zoom, setZoom] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(doc.id);
  const [compareTargetDoc, setCompareTargetDoc] = useState<LegalDocument | null>(null);
  const [aiTargetDoc, setAiTargetDoc] = useState<LegalDocument | null>(null);
  const [relationFilter, setRelationFilter] = useState<string>('all');

  // Compute graph layout (coordinates for nodes and edges)
  const { nodes, edges, width, height } = useMemo(() => {
    const rawNodes: GraphNodeData[] = [];
    const rawEdges: GraphEdgeData[] = [];

    // Group nodes by tier: 1 (Luật), 2 (Nghị định), 3 (Thông tư), 4 (Công văn)
    const tierGroups: Record<number, { doc: LegalDocument; tier: 1 | 2 | 3 | 4; relationNotes?: string }[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    };

    // If there is rootLaw/ancestors, add them
    if (hierarchy.ancestors && hierarchy.ancestors.length > 0) {
      hierarchy.ancestors.forEach((anc) => {
        const tier = getTierForDocument(anc);
        if (!tierGroups[tier].some((x) => x.doc.id === anc.id)) {
          tierGroups[tier].push({ doc: anc, tier, relationNotes: 'Căn cứ ban hành' });
        }
      });
    }

    // Traverse hierarchyTree
    const flattenNodes = (n: HierarchyNode) => {
      if (!tierGroups[n.tier].some((existing) => existing.doc.id === n.document.id)) {
        tierGroups[n.tier].push({
          doc: n.document,
          tier: n.tier,
          relationNotes: n.relationNotes || undefined,
        });
      }
      if (n.children) {
        n.children.forEach((child) => {
          flattenNodes(child);
        });
      }
    };

    hierarchy.hierarchyTree.forEach(flattenNodes);

    // Build coordinates
    const startY = 60;
    const layerSpacingY = 170;
    const nodeWidth = 260;
    const nodeGapX = 60;

    const maxItemsInAnyTier = Math.max(
      tierGroups[1].length,
      tierGroups[2].length,
      tierGroups[3].length,
      tierGroups[4].length,
      1
    );

    const canvasWidth = Math.max(850, maxItemsInAnyTier * (nodeWidth + nodeGapX) + 120);

    const tierYMap: Record<number, number> = {
      1: startY,
      2: startY + layerSpacingY,
      3: startY + layerSpacingY * 2,
      4: startY + layerSpacingY * 3,
    };

    ([1, 2, 3, 4] as const).forEach((tier) => {
      const items = tierGroups[tier];
      const count = items.length;
      if (count === 0) return;

      const totalTierWidth = count * nodeWidth + (count - 1) * nodeGapX;
      const startX = (canvasWidth - totalTierWidth) / 2;

      items.forEach((item, index) => {
        const x = startX + index * (nodeWidth + nodeGapX) + nodeWidth / 2;
        const y = tierYMap[tier];

        rawNodes.push({
          id: item.doc.id,
          document: item.doc,
          tier: item.tier,
          relationNotes: item.relationNotes,
          x,
          y,
          isCurrent: item.doc.id === doc.id,
        });
      });
    });

    // Create edges connecting parent to children
    const nodeCoordMap = new Map<string, { x: number; y: number }>();
    rawNodes.forEach((n) => nodeCoordMap.set(n.id, { x: n.x, y: n.y }));

    const linkEdges = (parent: HierarchyNode) => {
      const pCoord = nodeCoordMap.get(parent.document.id);
      if (pCoord && parent.children) {
        parent.children.forEach((child) => {
          const cCoord = nodeCoordMap.get(child.document.id);
          if (cCoord) {
            rawEdges.push({
              sourceId: parent.document.id,
              targetId: child.document.id,
              sourceX: pCoord.x,
              sourceY: pCoord.y + 40,
              targetX: cCoord.x,
              targetY: cCoord.y - 40,
              label:
                child.relationNotes ||
                (child.tier === 2
                  ? 'Quy định chi tiết'
                  : child.tier === 3
                  ? 'Hướng dẫn thi hành'
                  : 'Giải đáp nghiệp vụ'),
              type: child.tier === 4 ? 'cong_van' : 'huong_dan',
            });
          }
          linkEdges(child);
        });
      }
    };

    hierarchy.hierarchyTree.forEach(linkEdges);

    const canvasHeight = startY + layerSpacingY * 3 + 140;

    return {
      nodes: rawNodes,
      edges: rawEdges,
      width: canvasWidth,
      height: canvasHeight,
    };
  }, [hierarchy, doc.id]);

  const selectedNode = useMemo(() => {
    return (
      nodes.find((n) => n.id === selectedNodeId) ||
      nodes.find((n) => n.isCurrent) ||
      nodes[0]
    );
  }, [nodes, selectedNodeId]);

  const getTierColor = (tier: 1 | 2 | 3 | 4) => {
    switch (tier) {
      case 1:
        return {
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'LUẬT GỐC / BỘ LUẬT',
        };
      case 2:
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'NGHỊ ĐỊNH CHI TIẾT',
        };
      case 3:
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          label: 'THÔNG TƯ HƯỚNG DẪN',
        };
      case 4:
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          label: 'CÔNG VĂN ÁP DỤNG',
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 text-slate-100 relative overflow-hidden select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-3 bg-slate-800/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-800">
            <Layers className="w-3.5 h-3.5" />
            <span>BẢN ĐỒ PHẢ HỆ PHÁP LÝ & MẠNG LƯỚI VIỆN DẪN</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            ({nodes.length} văn bản liên kết trong cây phả hệ)
          </span>
        </div>

        {/* Filter & Zoom controls */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setRelationFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                relationFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setRelationFilter('huong_dan')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                relationFilter === 'huong_dan'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Nghị định/Thông tư
            </button>
            <button
              onClick={() => setRelationFilter('cong_van')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                relationFilter === 'cong_van'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Công văn
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive SVG Canvas */}
      <div className="flex-1 overflow-auto p-8 pt-16 flex justify-center items-start">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            width: `${width}px`,
            height: `${height}px`,
          }}
          className="relative"
        >
          <svg
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Render Connecting Bézier Edges */}
            {edges.map((edge, idx) => {
              if (relationFilter === 'cong_van' && edge.type !== 'cong_van') return null;
              if (relationFilter === 'huong_dan' && edge.type === 'cong_van') return null;

              const isHighlighted =
                hoveredNodeId === edge.sourceId ||
                hoveredNodeId === edge.targetId ||
                selectedNodeId === edge.sourceId ||
                selectedNodeId === edge.targetId;

              // Cubic Bézier curve
              const midY = (edge.sourceY + edge.targetY) / 2;
              const pathD = `M ${edge.sourceX} ${edge.sourceY} C ${edge.sourceX} ${midY}, ${edge.targetX} ${midY}, ${edge.targetX} ${edge.targetY}`;

              return (
                <g key={`edge-${idx}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isHighlighted ? '#60a5fa' : '#334155'}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={edge.type === 'cong_van' ? '4 3' : undefined}
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-200"
                  />
                  {edge.label && (
                    <text
                      x={(edge.sourceX + edge.targetX) / 2}
                      y={midY}
                      fill={isHighlighted ? '#93c5fd' : '#64748b'}
                      fontSize="10"
                      fontWeight="500"
                      textAnchor="middle"
                      className="bg-slate-900 px-1 select-none"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Render Interactive Nodes */}
          {nodes.map((node) => {
            if (relationFilter === 'cong_van' && node.tier !== 4 && !node.isCurrent) return null;
            if (relationFilter === 'huong_dan' && node.tier === 4 && !node.isCurrent) return null;

            const tCol = getTierColor(node.tier);
            const effStatus = getEffectiveStatus(node.document);
            const isHovered = hoveredNodeId === node.id;
            const isSelected = selectedNodeId === node.id;

            return (
              <div
                key={node.id}
                style={{
                  left: `${node.x - 130}px`,
                  top: `${node.y - 40}px`,
                  width: '260px',
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => setSelectedNodeId(node.id)}
                className={`absolute p-3 rounded-xl border transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-md ${
                  node.isCurrent
                    ? 'bg-slate-800/95 border-blue-500 ring-2 ring-blue-500/50 shadow-blue-500/20'
                    : isSelected
                    ? 'bg-slate-800/95 border-indigo-400 ring-2 ring-indigo-400/40'
                    : isHovered
                    ? 'bg-slate-800/90 border-slate-500'
                    : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {/* Node Header */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span
                    className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${tCol.badge}`}
                  >
                    {tCol.label}
                  </span>
                  <span
                    className={`text-[9.5px] font-semibold px-1.5 py-0.2 rounded ${DOCUMENT_STATUS_COLORS[effStatus]}`}
                  >
                    {DOCUMENT_STATUS_LABELS[effStatus]}
                  </span>
                </div>

                {/* Document Number & Title */}
                <div className="font-mono text-xs font-bold text-white mb-0.5 flex items-center justify-between">
                  <span>{node.document.document_number}</span>
                  {node.isCurrent && (
                    <span className="text-[9px] bg-blue-600 text-white px-1 rounded font-sans uppercase">
                      Đang đọc
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-slate-300 line-clamp-2 leading-snug">
                  {node.document.title}
                </div>

                {/* Bottom Metadata & Quick Action */}
                <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{node.document.issuing_body}</span>
                  <div className="flex items-center gap-1">
                    {!node.isCurrent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompareTargetDoc(node.document);
                        }}
                        className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px] font-semibold flex items-center gap-0.5"
                        title="Đối chiếu sửa đổi"
                      >
                        <GitCompare className="w-2.5 h-2.5 text-blue-400" />
                        <span>Đối chiếu</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDocument(node.document.id);
                      }}
                      className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold flex items-center gap-0.5"
                      title="Mở toàn văn"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>Mở</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Floating Info Drawer for Selected Node */}
      {selectedNode && (
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 flex items-center justify-between gap-4 z-20 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">
                  {selectedNode.document.document_number}
                </span>
                <span className="text-slate-400">—</span>
                <span className="text-slate-200 truncate font-medium">
                  {selectedNode.document.title}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                <span>Cơ quan: {selectedNode.document.issuing_body}</span>
                <span>Ngày ban hành: {formatDate(selectedNode.document.issued_date)}</span>
                <span>Ngày hiệu lực: {formatDate(selectedNode.document.effective_date)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!selectedNode.isCurrent && (
              <button
                onClick={() => setCompareTargetDoc(selectedNode.document)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Columns2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Đối chiếu song song</span>
              </button>
            )}
            <button
              onClick={() => onSelectDocument(selectedNode.document.id)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Đọc toàn văn văn bản này</span>
            </button>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {compareTargetDoc && (
        <LegalDiffViewer
          documentA={doc}
          documentB={compareTargetDoc}
          onClose={() => setCompareTargetDoc(null)}
          onSelectDocument={onSelectDocument}
        />
      )}

      {/* Cross-Doc AI Analysis Modal */}
      {aiTargetDoc && (
        <CrossDocAnalysisModal
          isOpen={Boolean(aiTargetDoc)}
          onClose={() => setAiTargetDoc(null)}
          primaryDocument={doc}
          initialSelectedDocuments={aiTargetDoc ? [aiTargetDoc] : []}
          onSelectDocument={onSelectDocument}
        />
      )}
    </div>
  );
}
