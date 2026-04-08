'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, IndianRupee } from 'lucide-react';

export interface BifurcationItem {
  id: string;
  description: string;
  amount: number;
  gstRate: number;
  gstAmount: number;
  total: number;
}

interface Props {
  data: BifurcationItem[];
  onChange: (data: BifurcationItem[]) => void;
  readOnly?: boolean;
}

export default function BifurcationTable({ data, onChange, readOnly = false }: Props) {
  const addItem = () => {
    if (readOnly) return;
    const newItem: BifurcationItem = {
      id: crypto.randomUUID(),
      description: '',
      amount: 0,
      gstRate: 0,
      gstAmount: 0,
      total: 0,
    };
    onChange([...data, newItem]);
  };

  const removeItem = (id: string) => {
    if (readOnly) return;
    onChange(data.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof BifurcationItem, value: string | number) => {
    if (readOnly) return;
    const newData = data.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate GST and Total
        if (field === 'amount' || field === 'gstRate') {
          const amount = Number(field === 'amount' ? value : item.amount) || 0;
          const gstRate = Number(field === 'gstRate' ? value : item.gstRate) || 0;
          updatedItem.gstAmount = (amount * gstRate) / 100;
          updatedItem.total = amount + updatedItem.gstAmount;
        }
        
        return updatedItem;
      }
      return item;
    });
    onChange(newData);
  };

  const grandTotal = data.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <div className="bifurcation-container" style={{ 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: 16, 
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'rgba(15,23,42,0.6)', borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--slate)', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Description</th>
            <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--slate)', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, width: 120 }}>Base (₹)</th>
            <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--slate)', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, width: 100 }}>GST (%)</th>
            <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--slate)', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, width: 120 }}>Total (₹)</th>
            {!readOnly && <th style={{ width: 50 }}></th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={readOnly ? 4 : 5} style={{ padding: '30px', textAlign: 'center', color: 'var(--slate-light)', fontStyle: 'italic' }}>
                No items added. Click below to add bifurcation.
              </td>
            </tr>
          )}
          {data.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover:bg-white/[0.02]">
              <td style={{ padding: '10px 16px' }}>
                {readOnly ? (
                  <div style={{ fontWeight: 600, color: 'var(--midnight)' }}>{item.description}</div>
                ) : (
                  <input
                    className="field-input"
                    style={{ marginBottom: 0, padding: '8px 12px', fontSize: 13 }}
                    placeholder="e.g. Flight Tickets, Hotel..."
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                )}
              </td>
              <td style={{ padding: '10px 16px' }}>
                {readOnly ? (
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                ) : (
                  <input
                    type="number"
                    className="field-input text-right"
                    style={{ marginBottom: 0, padding: '8px 12px', fontSize: 13 }}
                    placeholder="0.00"
                    value={item.amount || ''}
                    onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                  />
                )}
              </td>
              <td style={{ padding: '10px 16px' }}>
                {readOnly ? (
                  <div style={{ textAlign: 'right', color: 'var(--slate)' }}>{item.gstRate}%</div>
                ) : (
                  <select
                    className="field-input"
                    style={{ marginBottom: 0, padding: '8px 12px', fontSize: 13 }}
                    value={item.gstRate}
                    onChange={(e) => updateItem(item.id, 'gstRate', e.target.value)}
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                )}
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--midnight)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--slate-light)' }}>₹</span>
                  {item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                {item.gstAmount > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--emerald)', fontWeight: 700 }}>
                    Incl. ₹{item.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} GST
                  </div>
                )}
              </td>
              {!readOnly && (
                <td style={{ padding: '10px 16px' }}>
                  <button 
                    onClick={() => removeItem(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: 'rgba(16,185,129,0.05)' }}>
            <td colSpan={readOnly ? 3 : 3} style={{ padding: '16px', textAlign: 'right', fontWeight: 800, color: 'var(--slate)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Grand Total
            </td>
            <td style={{ padding: '16px', textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                <IndianRupee size={16} />
                {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </td>
            {!readOnly && <td></td>}
          </tr>
        </tfoot>
      </table>
      {!readOnly && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <button 
            className="btn btn-outline btn-sm" 
            onClick={addItem}
            style={{ width: '100%', borderStyle: 'dashed', background: 'transparent' }}
          >
            <Plus size={14} /> Add Row
          </button>
        </div>
      )}
    </div>
  );
}
