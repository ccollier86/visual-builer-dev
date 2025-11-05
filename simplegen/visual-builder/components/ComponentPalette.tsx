/**
 * Component Palette - Draggable component library
 */

'use client';

import type { PaletteItem } from '../types/template';

const PALETTE_ITEMS: PaletteItem[] = [
  // LAYOUT
  {
    id: 'section',
    type: 'section',
    name: 'Section',
    icon: '📄',
    category: 'layout',
    description: 'Container for fields'
  },
  {
    id: 'grid',
    type: 'grid',
    name: 'Grid',
    icon: '🔲',
    category: 'layout',
    description: 'Multi-column layout'
  },
  {
    id: 'divider',
    type: 'divider',
    name: 'Divider',
    icon: '━━',
    category: 'layout',
    description: 'Visual separator'
  },
  {
    id: 'spacer',
    type: 'spacer',
    name: 'Spacer',
    icon: '⬜',
    category: 'layout',
    description: 'Empty space'
  },

  // CONTENT
  {
    id: 'field-text',
    type: 'field',
    name: 'Text Field',
    icon: '📝',
    category: 'content',
    description: 'Single text value'
  },
  {
    id: 'field-computed',
    type: 'field',
    name: 'Computed Field',
    icon: '🔢',
    category: 'content',
    description: 'Calculated value'
  },
  {
    id: 'field-ai',
    type: 'field',
    name: 'AI Field',
    icon: '🤖',
    category: 'content',
    description: 'AI-generated content'
  },
  {
    id: 'narrative',
    type: 'narrative',
    name: 'Narrative',
    icon: '📋',
    category: 'content',
    description: 'Multi-paragraph text'
  },
  {
    id: 'list',
    type: 'list',
    name: 'List',
    icon: '📑',
    category: 'content',
    description: 'Ordered or unordered list'
  },
  {
    id: 'table',
    type: 'table',
    name: 'Table',
    icon: '📊',
    category: 'content',
    description: 'Structured data table'
  },

  // SPECIAL
  {
    id: 'alert',
    type: 'alert',
    name: 'Alert Box',
    icon: '⚠️',
    category: 'special',
    description: 'Highlighted important info'
  },
  {
    id: 'image',
    type: 'image',
    name: 'Image',
    icon: '🖼️',
    category: 'special',
    description: 'Logo or graphic'
  }
];

const CATEGORIES = [
  { id: 'layout', name: 'Layout', emoji: '📦' },
  { id: 'content', name: 'Content', emoji: '📝' },
  { id: 'special', name: 'Special', emoji: '🎨' }
] as const;

export function ComponentPalette() {
  return (
    <aside className="component-palette">
      <div className="palette-header">
        <h2>Components</h2>
        <p className="palette-hint">Drag to add</p>
      </div>

      <div className="palette-sections">
        {CATEGORIES.map(category => {
          const items = PALETTE_ITEMS.filter(item => item.category === category.id);

          return (
            <div key={category.id} className="palette-category">
              <h3 className="category-title">
                <span className="category-emoji">{category.emoji}</span>
                {category.name}
              </h3>

              <div className="palette-items">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`palette-item palette-${item.type}`}
                    data-component-type={item.type}
                    data-palette-id={item.id}
                    draggable="false" // GSAP will handle dragging
                    title={item.description}
                  >
                    <span className="item-icon">{item.icon}</span>
                    <span className="item-name">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .component-palette {
          width: 280px;
          height: 100%;
          background: #f9fafb;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .palette-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          background: white;
        }

        .palette-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .palette-hint {
          margin: 4px 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .palette-sections {
          flex: 1;
          padding: 16px;
        }

        .palette-category {
          margin-bottom: 24px;
        }

        .category-title {
          margin: 0 0 12px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .category-emoji {
          font-size: 14px;
        }

        .palette-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .palette-item {
          padding: 12px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          cursor: grab;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.15s;
          user-select: none;
        }

        .palette-item:hover {
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
          transform: translateY(-1px);
        }

        .palette-item:active {
          cursor: grabbing;
        }

        .item-icon {
          font-size: 20px;
          line-height: 1;
        }

        .item-name {
          font-size: 13px;
          font-weight: 500;
          color: #1f2937;
        }

        /* Special styling for different types */
        .palette-field {
          border-left: 3px solid #10b981;
        }

        .palette-section {
          border-left: 3px solid #3b82f6;
        }

        .palette-alert {
          border-left: 3px solid #f59e0b;
        }
      `}</style>
    </aside>
  );
}
