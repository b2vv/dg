# R6-7b критик пасток — Dg25

Модель: claude-opus-4-8

ДАЛІ: читаю lines-spec §8, staffEdgeGeometry.ts (classifyStaffEdgeRoute, buildStaffEdgeSegments, edgeIntrudesForeignFrame, StaffEdgeFrame), staffRouterV2.ts (resolveStaffRouting, deptFrames), resolveHead.ts, обидва callers (staffLiveGeometry, svgExport), staffEdgeArrows.ts (drawEdgeEndDots).

## ФАКТИ (звірено з кодом)
- Кінцевий порт ребра = геометрія `to`-картки (verticalPolyline last=(toCx,to.y)); deptTop-гілки нема. staffEdgeGeometry.ts:123-168,391-404.
- around-left завершує на БОЦІ картки mid-height (to.x,toCy) — НЕ top-center. staffEdgeGeometry.ts:96-107,398,402.
- StaffEdgeSegment не має прапора head-target; painter не відрізнить. staffEdgeGeometry.ts:63-72.
- drawEdgeEndDots малює ОБИДВА кінці й привʼязаний до terminator===dot. staffEdgeArrows.ts:86-99; StaffEdgesView.ts:71,89,99.
- svgExport НЕ малює end-dots узагалі (лише arrowhead). svgExport.ts:310-334.
- StaffEdgeBox не має departmentId; StaffEdgeLink.kind не має int. staffEdgeGeometry.ts:31-44,52-56.
- Frame будується в seam з memberBoxesByDept (positionById), БЕЗ reportLines. staffRouterV2.ts:60-67.
- resolveHead ORG-scoped (filter organizationId, headId-keyed). resolveHead.ts:26-46.
- both callers мають data.reportLines; seam нині reportLines НЕ отримує (2 call sites). staffLiveGeometry.ts:119-127; svgExport.ts:293-301.
- own-frame не хибно-intrusion: to є member → виключено. staffEdgeGeometry.ts:250-254.
