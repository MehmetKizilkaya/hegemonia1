import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Region } from '@hegemonia/shared';

export function MapPage() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);

  const { data: regions, isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.get<Region[]>('/regions'),
  });

  const regionBySvgId = new Map(regions?.map((r) => [r.svgPathId, r]));

  useEffect(() => {
    if (!svgRef.current || !regions) return;

    fetch('/turkey.svg')
      .then((r) => r.text())
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const paths = doc.querySelectorAll('path');
        const g = svgRef.current?.querySelector('#map-paths');
        if (!g) return;
        g.innerHTML = '';

        paths.forEach((path) => {
          const clone = path.cloneNode(true) as SVGPathElement;
          const region = regionBySvgId.get(clone.id);
          clone.style.fill = region ? '#2d4a6f' : '#1a2332';
          clone.style.stroke = '#3b82f6';
          clone.style.strokeWidth = '0.5';
          clone.style.cursor = 'pointer';
          clone.style.transition = 'fill 0.15s';

          clone.addEventListener('mouseenter', () => {
            clone.style.fill = '#3b82f6';
          });
          clone.addEventListener('mouseleave', () => {
            clone.style.fill = '#2d4a6f';
          });
          clone.addEventListener('click', () => {
            if (region) navigate(`/region/${region.id}`);
          });

          g.appendChild(clone);
        });
      });
  }, [regions, navigate, regionBySvgId]);

  if (isLoading) return <div className="page"><p>Yükleniyor...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">Türkiye Haritası</h1>
      <div className="card" style={{ overflow: 'hidden', padding: '0.5rem' }}>
        <svg ref={svgRef} viewBox="0 0 792.5976 334.55841" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <g id="map-paths" />
        </svg>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
        Bir ile tıklayarak detayları görüntüleyin · {regions?.length ?? 0} il
      </p>
    </div>
  );
}
