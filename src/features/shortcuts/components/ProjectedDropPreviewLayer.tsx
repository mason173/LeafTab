import type { ProjectedDropPreview } from '@/features/shortcuts/drag/linearReorderProjection';
import { renderLeaftabDropPreview } from './leaftabGridVisuals';

export function ProjectedDropPreviewLayer({
  preview,
  testId,
}: {
  preview: ProjectedDropPreview | null;
  testId?: string;
}) {
  if (!preview) {
    return null;
  }

  return renderLeaftabDropPreview({
    ...preview,
    testId,
  });
}
