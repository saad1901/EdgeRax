export interface Internship {
  id: string
  title: string
  domain: string
  description: string
  shortDescription: string
  duration: string
  stipend: string
  applicationFee: number
  joiningFee: number
  seats: number
  requirements: string
  perks: string
  status: "open" | "closed" | "draft"
  lastDateToApply: string | null
  startDate: string | null
  thumbnail: string
  createdAt: string
  updatedAt: string
  applicationCount?: number
}

export interface InternshipApplication {
  id: string
  internshipId: string
  userId: string
  amount: number
  paymentId: string
  paidAt: string | null
  joiningFeeAmount: number
  joiningFeePaymentId: string
  joiningFeePaidAt: string | null
  resumeUrl: string
  coverLetter: string
  status: "pending" | "offered" | "accepted" | "rejected"
  offerLetterUrl: string
  offerSentAt: string | null
  adminNote: string
  appliedAt: string
  updatedAt: string
  applicant?: {
    id: string
    name: string
    email: string
    phone?: string
  }
}

export interface InternshipTask {
  id: string
  applicationId: string
  internshipId: string
  userId: string
  title: string
  description: string
  deadline: string | null
  status: "pending" | "submitted" | "approved" | "rejected"
  submissionNote: string
  submissionUrl: string
  adminFeedback: string
  createdAt: string
  updatedAt: string
}
