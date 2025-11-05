/**
 * Component Palette - Draggable component library
 */

'use client';

import {
  LayoutList,
  Grid3x3,
  Minus,
  Square,
  Database,
  Calculator,
  Sparkles,
  FileText,
  List,
  Table2,
  AlertCircle,
  Image
} from 'lucide-react';

interface PaletteItemWithIcon {
  id: string;
  type: string;
  name: string;
  Icon: any;
  category: string;
  description: string;
}

const PALETTE_ITEMS: PaletteItemWithIcon[] = [
  // LAYOUT
  {
    id: 'section',
    type: 'section',
    name: 'Section',
    Icon: LayoutList,
    category: 'layout',
    description: 'Container for fields'
  },
  {
    id: 'grid',
    type: 'grid',
    name: 'Grid',
    Icon: Grid3x3,
    category: 'layout',
    description: 'Multi-column layout'
  },
  {
    id: 'divider',
    type: 'divider',
    name: 'Divider',
    Icon: Minus,
    category: 'layout',
    description: 'Visual separator'
  },
  {
    id: 'spacer',
    type: 'spacer',
    name: 'Spacer',
    Icon: Square,
    category: 'layout',
    description: 'Empty space'
  },

  // CONTENT
  {
    id: 'field-text',
    type: 'field',
    name: 'Text Field',
    Icon: Database,
    category: 'content',
    description: 'Single text value'
  },
  {
    id: 'field-computed',
    type: 'field',
    name: 'Computed Field',
    Icon: Calculator,
    category: 'content',
    description: 'Calculated value'
  },
  {
    id: 'field-ai',
    type: 'field',
    name: 'AI Field',
    Icon: Sparkles,
    category: 'content',
    description: 'AI-generated content'
  },
  {
    id: 'narrative',
    type: 'narrative',
    name: 'Narrative',
    Icon: FileText,
    category: 'content',
    description: 'Multi-paragraph text'
  },
  {
    id: 'list',
    type: 'list',
    name: 'List',
    Icon: List,
    category: 'content',
    description: 'Ordered or unordered list'
  },
  {
    id: 'table',
    type: 'table',
    name: 'Table',
    Icon: Table2,
    category: 'special',
    description: 'Structured data grid'
  },
  {
    id: 'alert',
    type: 'alert',
    name: 'Alert',
    Icon: AlertCircle,
    category: 'special',
    description: 'Important notice'
  },
  {
    id: 'image',
    type: 'image',
    name: 'Image',
    Icon: Image,
    category: 'special',
    description: 'Image or diagram'
  }
];

const CATEGORIES = [
  { id: 'layout', name: 'Layout', Icon: LayoutList },
  { id: 'content', name: 'Content', Icon: FileText },
  { id: 'special', name: 'Special', Icon: AlertCircle }
];

export function ComponentPalette() {
  return (
    <aside className="palette-panel">
      <div className="palette-header">
        <h2>Components</h2>
      </div>

      <div className="palette-content">
        {CATEGORIES.map(category => {
          const CategoryIcon = category.Icon;
          const items = PALETTE_ITEMS.filter(item => item.category === category.id);

          return (
            <div key={category.id} className="palette-category">
              <div className="category-header">
                <CategoryIcon size={14} />
                <span>{category.name}</span>
              </div>

              <div className="palette-items">
                {items.map(item => {
                  const ItemIcon = item.Icon;
                  return (
                    <div
                      key={item.id}
                      className="palette-item"
                      data-component-type={item.type}
                      data-palette-id={item.id}
                    >
                      <div className="item-icon">
                        <ItemIcon size={16} />
                      </div>
                      <div className="item-info">
                        <div className="item-name">{item.name}</div>
                        <div className="item-desc">{item.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .palette-panel {
          width: 280px;
          background: white;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .palette-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .palette-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .palette-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .palette-category {
          margin-bottom: 24px;
        }

        .palette-category:last-child {
          margin-bottom: 0;
        }

        .category-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .palette-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .palette-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: grab;
          transition: all 0.15s;
        }

        .palette-item:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .palette-item:active {
          cursor: grabbing;
        }

        .item-icon {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          color: #6b7280;
        }

        .item-info {
          flex: 1;
          min-width: 0;
        }

        .item-name {
          font-size: 13px;
          font-weight: 500;
          color: #111827;
          margin-bottom: 2px;
        }

        .item-desc {
          font-size: 11px;
          color: #6b7280;
          line-height: 1.4;
        }
      `}</style>
    </aside>
  );
}
