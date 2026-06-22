# Phase 1 — Agent runtime + registry (pure refactor, không đổi hành vi)

**Mục tiêu:** Nhấc engine demo-gen claude-CLI đã chứng minh thành 1 **runtime + registry dùng chung**, rồi re-express demo pipeline qua nó với hành vi **byte-for-byte y hệt**. Đây là nền móng; chưa có gì mới "bắn".

**Phụ thuộc:** không. **Key-gated:** không (chạy trên `CLAUDE_CODE_OAUTH_TOKEN` sẵn có; typecheck/build không cần DB/key).

## Bối cảnh
`lib/demo-gen/` đã chứa mọi khái niệm "agent" nhưng bị inline: `REVIEW_PERSONAS` = mảng `{key, brief(input)}` (mỗi brief là 1 system prompt theo vai trò); `runClaude(prompt, opts)` = "gọi 1 agent"; `extractHtml`+`assertCompleteHtml` = validate output; `vision-scoring.ts` = pattern JSON schema. Việc cần làm: **nhấc runtime ra ngoài**, biến mỗi prompt-builder thành `AgentDef` có kiểu + hợp đồng output.

## Files tạo mới
- `lib/agents/types.ts` — `AgentDef<I,O>`, `AgentId`, `AgentModel`, `AgentTool`, `AgentContext`, `AgentResult`, `OutputValidator<O>`. (Shape đầy đủ ở `plan.md` §3.)
- `lib/agents/runner.ts` — `runAgent(def,input,ctx)` (nhấc nguyên `runClaude`/`resultText` từ `generate.ts`, đổi `MODEL` const → `def.model`, `RunOpts.allowRead` → `def.tools` → `--allowedTools`) + `runBoard(defs,input,ctx)` (tổng quát hóa `REVIEW_PERSONAS.map(...).catch('')` — parallel best-effort).
- `lib/agents/validators.ts` — `makeHtmlValidator()` (= `extractHtml`+`assertCompleteHtml`) + `makeTextValidator()` (non-empty trim). `makeJsonValidator(zodSchema)` HOÃN sang Phase 4 (zod chưa thêm).
- `lib/agents/registry.ts` — `AGENTS: Record<AgentId, AgentDef>` + `getAgent(id)`.
- `lib/agents/defs/atlas-strategist.ts` (= `buildDirectorPrompt`+`artDirectionFor`), `nova-designer.ts` (= `buildBuildPrompt`+`craftConstraints`), `iris-ux.ts` (= `REVIEW_PERSONAS.uiux`, tools `['Read']`), `kira-qa.ts` (= `REVIEW_PERSONAS.art`). Mỗi file **import** prompt-builder từ `lib/demo-gen/prompt.ts`, KHÔNG nhân bản.
- `lib/agents/board.ts` — `REVIEW_BOARD: AgentId[]` (thành phần hội đồng review data-driven).
- `lib/agents/pipelines/demo.ts` — re-impl `generateDemoHtml` qua registry/runBoard (cùng thứ tự: director → build → board → synthesise → revise).

## Files sửa
- `lib/inngest/functions/run-demo-gen.ts` — gọi pipeline mới (`pipelines/demo.ts`) thay vì `generate.ts`.
- `lib/demo-gen/generate.ts` — gỡ phần ORCHESTRATION (đã chuyển sang `pipelines/demo.ts`); **GIỮ `prompt.ts` nguyên** làm thư viện nội dung (`clientBlock`, `craftConstraints`, `AI_TELLS`, `REVIEW_PERSONAS`, các builder). `render.ts`/`art-direction.ts` giữ nguyên.

## Các bước
1. Tạo `types.ts` (định nghĩa interface).
2. Nhấc `runClaude`/`resultText`/`extractHtml`/`assertCompleteHtml` → `runner.ts` + `validators.ts` (copy nguyên logic, chỉ tham số hóa model/tools/limits).
3. Viết 4 `defs/*` wrap builder sẵn có.
4. Viết `pipelines/demo.ts` tái hiện đúng luồng `generateDemoHtml`.
5. Trỏ `run-demo-gen.ts` sang pipeline mới; dọn orchestration cũ trong `generate.ts`.

## Acceptance (verify)
- `npm run typecheck` · `npm run lint` · `npm run test` (150) · `npm run build` đều xanh.
- **Hành vi y hệt:** sinh lại 1 demo (cùng input Batdongsan) qua đường mới → vẫn ra HTML hoàn chỉnh, đủ pass (so sánh độ dài/cấu trúc với bản cũ). Không regression chất lượng.
- Worker rebuild + 1 lượt `demo/requested` chạy thành công như trước.

## Rủi ro / rollback
- **tsx-safety:** `lib/agents/*` phải relative imports + no `server-only`. Test bằng cách worker chạy thật (tsx) chứ chỉ typecheck là chưa đủ.
- Rollback: pure refactor 1 PR — revert là về nguyên trạng demo-gen.
