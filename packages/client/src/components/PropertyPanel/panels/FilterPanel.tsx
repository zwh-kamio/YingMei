import React, { useState } from 'react';
import { Slider, Button } from 'antd';
import * as fabric from 'fabric';
import { useEditorStore } from '../../../stores/editorStore';
import { setPanelFilters, resetPanelFilters } from '../../../editor/filters/ImageFilters';
import { filterPresets, categoryLabels, type FilterPreset } from '../../../editor/filters/filterPresets';

export default function FilterPanel() {
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset | null>(null);
  const [intensity, setIntensity] = useState(50);

  const categories = [...new Set(filterPresets.map((f) => f.category))];

  const applyFilter = (preset: FilterPreset, strength: number) => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;

    const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) return;

    const s = strength / 100;
    const { matrix } = preset;
    // 在原始矩阵和单位矩阵之间插值
    const identity = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
    const interpolated = matrix.map((v, i) => v * s + identity[i] * (1 - s));

    const filters: fabric.filters.BaseFilter<any>[] = [];
    if (strength > 0) {
      filters.push(new fabric.filters.ColorMatrix({ matrix: interpolated }));
    }

    setPanelFilters(bgImage, 'filter', filters);
    canvas.renderAll();
  };

  const handleSelectFilter = (preset: FilterPreset) => {
    setSelectedFilter(preset);
    setIntensity(preset.defaultIntensity);
    applyFilter(preset, preset.defaultIntensity);
  };

  const handleIntensityChange = (v: number) => {
    setIntensity(v);
    if (selectedFilter) {
      applyFilter(selectedFilter, v);
    }
  };

  const handleReset = () => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;
    const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) return;

    resetPanelFilters(bgImage, 'filter');
    canvas.renderAll();
    setSelectedFilter(null);
    setIntensity(50);
  };

  return (
    <div>
      {/* 强度控制 */}
      {selectedFilter && (
        <div className="param-group">
          <div className="param-group-label">
            滤镜强度 — {selectedFilter.name}
          </div>
          <div className="param-row">
            <Slider
              min={0}
              max={100}
              value={intensity}
              onChange={handleIntensityChange}
              style={{ flex: 1 }}
            />
            <span className="param-value">{intensity}%</span>
          </div>
          <Button size="small" onClick={handleReset} style={{ marginTop: 8 }}>
            取消滤镜
          </Button>
        </div>
      )}

      {/* 分类滤镜列表 */}
      {categories.map((cat) => (
        <div className="param-group" key={cat}>
          <div className="param-group-label">{categoryLabels[cat]}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {filterPresets
              .filter((f) => f.category === cat)
              .map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectFilter(preset)}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    border: `1px solid ${selectedFilter?.id === preset.id ? '#FF6B81' : 'rgba(255,255,255,0.12)'}`,
                    background: selectedFilter?.id === preset.id ? 'rgba(255,107,129,0.15)' : 'rgba(255,255,255,0.04)',
                    color: selectedFilter?.id === preset.id ? '#FF6B81' : 'rgba(255,255,255,0.7)',
                    transition: 'all 0.2s',
                  }}
                >
                  {preset.name}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
