import { z } from 'zod'

export const openShiftSchema = z.object({
  openingCash: z.number().nonnegative('Tiền đầu ca không được âm').default(0),
  notes: z.string().max(500).optional(),
})

export const closeShiftSchema = z.object({
  closingCash: z.number().nonnegative('Tiền cuối ca không được âm'),
  notes: z.string().max(500).optional(),
})

export const manageShiftParticipantSchema = z.object({
  staffId: z.string().uuid('Nhân viên không hợp lệ'),
  role: z.enum(['LEAD', 'STAFF']).default('STAFF'),
})

export const removeShiftParticipantSchema = z.object({
  staffId: z.string().uuid('Nhân viên không hợp lệ'),
})

export type OpenShiftInput = z.infer<typeof openShiftSchema>
export type CloseShiftInput = z.infer<typeof closeShiftSchema>
export type ManageShiftParticipantInput = z.infer<typeof manageShiftParticipantSchema>
export type RemoveShiftParticipantInput = z.infer<typeof removeShiftParticipantSchema>
