import crypto from 'crypto';
import type { DocumentNode } from './types';

export class DocumentStructureParser {
  private documentId: string;
  private slug: string;

  constructor(documentId: string, slug?: string) {
    this.documentId = documentId;
    this.slug = slug || documentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private hash(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 16);
  }

  public parseHtml(htmlContent: string): DocumentNode[] {
    if (!htmlContent) return [];

    // Strip out HTML tags into clean lines while keeping header anchors
    const cleanText = htmlContent
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');

    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    return this.parseLines(lines);
  }

  public parseLines(lines: string[]): DocumentNode[] {
    const rootNodes: DocumentNode[] = [];
    let currentChapter: DocumentNode | null = null;
    let currentArticle: DocumentNode | null = null;
    let currentClause: DocumentNode | null = null;
    let orderCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Check for Chương (Chapter)
      const chapterMatch = line.match(/^(Chương\s+[IVXLCDM\d]+)[\.:\s]*(.*)/i);
      if (chapterMatch) {
        const numLabel = chapterMatch[1].trim();
        const title = chapterMatch[2].trim() || (lines[i + 1] && !lines[i + 1].startsWith('Điều') ? lines[++i].trim() : '');
        const chId = `${this.slug}.${numLabel.toLowerCase().replace(/\s+/g, '_')}`;

        currentChapter = {
          id: chId,
          document_id: this.documentId,
          node_type: 'chuong',
          order_index: orderCounter++,
          number_label: numLabel,
          title: title,
          content: `${numLabel}: ${title}`,
          content_hash: this.hash(`${numLabel}: ${title}`),
          path: numLabel,
          children: [],
        };
        rootNodes.push(currentChapter);
        currentArticle = null;
        currentClause = null;
        continue;
      }

      // 2. Check for Điều (Article)
      const articleMatch = line.match(/^(Điều\s+\d+[a-z]?)[\.:\s]*(.*)/i);
      if (articleMatch) {
        const numLabel = articleMatch[1].trim();
        const artNumber = numLabel.replace(/Điều\s*/i, '');
        const title = articleMatch[2].trim();
        const artId = `${this.slug}.art_${artNumber}`;
        const path = currentChapter ? `${currentChapter.number_label} > ${numLabel}` : numLabel;

        currentArticle = {
          id: artId,
          document_id: this.documentId,
          node_type: 'dieu',
          order_index: orderCounter++,
          number_label: numLabel,
          title: title,
          content: line,
          parent_id: currentChapter?.id,
          content_hash: this.hash(line),
          path: path,
          children: [],
        };

        if (currentChapter) {
          currentChapter.children = currentChapter.children || [];
          currentChapter.children.push(currentArticle);
        } else {
          rootNodes.push(currentArticle);
        }

        currentClause = null;
        continue;
      }

      // 3. Check for Khoản (Clause e.g. "1.", "2.", "Khoản 1.")
      const clauseMatch = line.match(/^(\d+)\.\s+(.*)/) || line.match(/^(Khoản\s+\d+[a-z]?)[\.:\s]*(.*)/i);
      if (clauseMatch && currentArticle) {
        const clauseNum = clauseMatch[1].replace(/Khoản\s*/i, '');
        const clauseLabel = `Khoản ${clauseNum}`;
        const clauseId = `${currentArticle.id}.cl_${clauseNum}`;
        const path = `${currentArticle.path} > ${clauseLabel}`;

        currentClause = {
          id: clauseId,
          document_id: this.documentId,
          node_type: 'khoan',
          order_index: orderCounter++,
          number_label: clauseLabel,
          content: line,
          parent_id: currentArticle.id,
          content_hash: this.hash(line),
          path: path,
          children: [],
        };

        currentArticle.children = currentArticle.children || [];
        currentArticle.children.push(currentClause);
        continue;
      }

      // 4. Check for Điểm (Point e.g. "a)", "b)", "đ)")
      const pointMatch = line.match(/^([a-zđ])\)\s+(.*)/i) || line.match(/^(Điểm\s+[a-zđ])[\.:\s]*(.*)/i);
      if (pointMatch && (currentClause || currentArticle)) {
        const pointLetter = pointMatch[1].replace(/Điểm\s*/i, '').toLowerCase();
        const pointLabel = `Điểm ${pointLetter}`;
        const parentNode = currentClause || currentArticle!;
        const pointId = `${parentNode.id}.pt_${pointLetter}`;
        const path = `${parentNode.path} > ${pointLabel}`;

        const pointNode: DocumentNode = {
          id: pointId,
          document_id: this.documentId,
          node_type: 'diem',
          order_index: orderCounter++,
          number_label: pointLabel,
          content: line,
          parent_id: parentNode.id,
          content_hash: this.hash(line),
          path: path,
        };

        parentNode.children = parentNode.children || [];
        parentNode.children.push(pointNode);
        continue;
      }

      // 5. Normal text inside current clause or article
      if (currentClause) {
        currentClause.content += `\n${line}`;
        currentClause.content_hash = this.hash(currentClause.content);
      } else if (currentArticle) {
        currentArticle.content += `\n${line}`;
        currentArticle.content_hash = this.hash(currentArticle.content);
      }
    }

    return rootNodes;
  }

  public flattenNodes(nodes: DocumentNode[]): DocumentNode[] {
    const flat: DocumentNode[] = [];
    const traverse = (nodeList: DocumentNode[]) => {
      for (const n of nodeList) {
        flat.push(n);
        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      }
    };
    traverse(nodes);
    return flat;
  }
}
