"use client"

import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import Image from "next/image"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="bg-gray-900 text-white py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">About RANAOJobs</h1>
              <p className="text-lg text-gray-300 max-w-3xl mx-auto">
                Connecting talented professionals with opportunities in Mindanao and beyond
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold">Our Mission</h2>
                <p className="text-gray-600">
                  At RANAOJobs, our mission is to bridge the gap between talented professionals and employers in the
                  Mindanao region and beyond. We believe that everyone deserves access to meaningful employment
                  opportunities that match their skills and aspirations.
                </p>
                <p className="text-gray-600">
                  We are committed to creating a platform that simplifies the job search process, promotes economic
                  growth in our communities, and helps businesses find the right talent to thrive in today's competitive
                  landscape.
                </p>
                <p className="text-gray-600">
                  Through innovation, inclusivity, and a deep understanding of the local job market, we strive to be the
                  leading employment platform in the region, connecting people with possibilities and helping shape a
                  brighter future for all.
                </p>
              </div>

              {/* Add error handling for image */}
              <div className="rounded-lg overflow-hidden shadow-lg">
                <div className="relative w-full h-75 md:h-100">
                  <Image
                    src="/images/mission-team.png"
                    alt="Team collaborating on projects"
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      e.currentTarget.src = "/placeholder.svg?height=400&width=600"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Our Values</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                The principles that guide our work and shape our platform
              </p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    title: "Inclusivity",
                    description:
                      "We believe in creating equal opportunities for all, regardless of background, gender, or experience level.",
                  },
                  {
                    title: "Innovation",
                    description:
                      "We continuously improve our platform to provide the best experience for job seekers and employers.",
                  },
                  {
                    title: "Integrity",
                    description:
                      "We operate with honesty and transparency in all our interactions and business practices.",
                  },
                  {
                    title: "Community",
                    description:
                      "We are committed to supporting local communities and contributing to economic growth in the region.",
                  },
                  {
                    title: "Excellence",
                    description:
                      "We strive for excellence in everything we do, from customer service to platform development.",
                  },
                  {
                    title: "Empowerment",
                    description:
                      "We empower individuals and businesses to achieve their goals and reach their full potential.",
                  },
                ].map((value, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                    <p className="text-gray-600">{value.description}</p>
                  </div>
                ))}
              </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Our Team</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Meet the dedicated Individuals behind RANAOJobs</p>
            </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 justify-center mx-auto max-w-7xl">
  {[
    {
      name: "Joseph C. Sieras, MSIT",
      role: "Capstone Adviser",
      bio: "College of Information and Computing Sciences Department of Information Sciences former Chairperson.",
      image: "/images/Sir_jong.jpg",
    },
    {
      name: "Hasanor Langilao",
      role: "Developer",
      bio: "Contributed to the development of the Ranao Job Portal, focusing on core features and backend functionality.",
      image: "/images/Hasanor.png",
    },
    {
      name: "Maecole kate Mejos",
      role: "Developer",
      bio: "Worked on the Ranao Job Portal as a developer, helping build and improve the user interface.",
      image: "/images/maecole.jpg",
    },
    {
      name: "Alinor Abdulgafor",
      role: "Developer",
      bio: "Played a key role in developing the Ranao Job Portal, with a focus on implementing core features and backend functionality.",
      image: "/images/Alinor.jpg",
    }
  ].map((member, index) => (
    <div key={index} className="bg-white p-8 rounded-xl shadow-lg text-center hover:shadow-xl transition">
      
      {/* Bigger Image */}
      <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center overflow-hidden">
        {member.image ? (
          <Image
            src={member.image}
            alt={member.name}
            width={128}
            height={128}
            className="object-cover w-32 h-32 rounded-full"
          />
        ) : (
          <span className="text-3xl font-bold text-gray-400">
            {member.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Bigger Text */}
      <h3 className="text-2xl font-semibold mb-2">{member.name}</h3>
      <p className="text-yellow-500 text-lg font-medium mb-4">{member.role}</p>
      <p className="text-gray-600 text-base">{member.bio}</p>
    </div>
  ))}
</div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
