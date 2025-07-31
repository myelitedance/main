// pages/team.js
export default function MeetTheTeam() {
  const teamMembers = [
    {
      name: 'Jane Doe',
      title: 'Artistic Director',
      image: '/images/team-placeholder.jpg',
      bio: 'Jane has over 20 years of experience teaching and choreographing in competitive and recreational dance programs across the country.'
    },
    {
      name: 'John Smith',
      title: 'Ballet Instructor',
      image: '/images/team-placeholder.jpg',
      bio: 'John specializes in classical technique and brings a deep passion for dance education to every class he teaches.'
    },
    // Add more team members here...
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-center mb-12 text-dance-purple">Meet the Team</h1>

      <div className="grid sm:grid-cols-2 gap-10">
        {teamMembers.map((member, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <img
              src={member.image}
              alt={member.name}
              className="w-full h-72 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold text-dance-purple">{member.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{member.title}</p>
              <p className="text-gray-700">{member.bio}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}