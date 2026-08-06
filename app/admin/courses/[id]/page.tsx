"use client"

import { CourseCurriculumManagerPage } from "@/components/course-curriculum-manager"

export default function CurriculumPage({ params }: { params: Promise<{ id: string }> }) {
  return <CourseCurriculumManagerPage params={params} mode="admin" />
}
