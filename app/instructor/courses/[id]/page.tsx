"use client"

import { CourseCurriculumManagerPage } from "@/components/course-curriculum-manager"

export default function InstructorCoursePage({ params }: { params: Promise<{ id: string }> }) {
  return <CourseCurriculumManagerPage params={params} mode="instructor" />
}
