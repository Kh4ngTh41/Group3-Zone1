// ============================================================
// data.js – Mock data: specialties, doctors, time slots
// Replace API calls here when backend is ready
// ============================================================

window.SPECIALTIES = [
  {
    id: 'neurology',
    emoji: '🧠',
    nameKey: 'specNeurology',
    doctors: 24,
    keywords: {
      vi: ['đau đầu', 'chóng mặt', 'mất ngủ', 'tê tay', 'run rẩy', 'đột quỵ', 'động kinh', 'thần kinh', 'đau nửa đầu', 'mất trí nhớ'],
      en: ['headache', 'dizziness', 'insomnia', 'numbness', 'tremor', 'stroke', 'epilepsy', 'neuropathy', 'migraine', 'memory loss'],
    },
  },
  {
    id: 'cardiology',
    emoji: '❤️',
    nameKey: 'specCardiology',
    doctors: 31,
    keywords: {
      vi: ['đau ngực', 'tim đập nhanh', 'khó thở', 'huyết áp', 'tim mạch', 'nhồi máu', 'đánh trống ngực', 'phù chân'],
      en: ['chest pain', 'palpitations', 'shortness of breath', 'blood pressure', 'heart', 'cardiac', 'hypertension', 'swollen legs'],
    },
  },
  {
    id: 'gastro',
    emoji: '🫃',
    nameKey: 'specGastro',
    doctors: 18,
    keywords: {
      vi: ['đau bụng', 'tiêu chảy', 'buồn nôn', 'nôn mửa', 'táo bón', 'đầy hơi', 'ợ chua', 'khó tiêu', 'dạ dày', 'đại tràng'],
      en: ['stomach pain', 'diarrhea', 'nausea', 'vomiting', 'constipation', 'bloating', 'acid reflux', 'indigestion', 'gastric'],
    },
  },
  {
    id: 'orthopedics',
    emoji: '🦴',
    nameKey: 'specOrthopedics',
    doctors: 22,
    keywords: {
      vi: ['đau lưng', 'đau khớp', 'đau vai', 'gãy xương', 'thoái hóa', 'viêm khớp', 'đau cột sống', 'tê tay chân'],
      en: ['back pain', 'joint pain', 'shoulder pain', 'fracture', 'arthritis', 'spine pain', 'bone pain', 'osteoporosis'],
    },
  },
  {
    id: 'dermatology',
    emoji: '💊',
    nameKey: 'specDermatology',
    doctors: 15,
    keywords: {
      vi: ['nổi mẩn', 'ngứa', 'da liễu', 'mụn', 'phát ban', 'eczema', 'vảy nến', 'nám da', 'dị ứng da'],
      en: ['rash', 'itching', 'skin', 'acne', 'eczema', 'psoriasis', 'allergy', 'hives', 'dermatitis'],
    },
  },
  {
    id: 'ent',
    emoji: '👂',
    nameKey: 'specENT',
    doctors: 20,
    keywords: {
      vi: ['đau họng', 'nghẹt mũi', 'chảy máu mũi', 'ù tai', 'điếc', 'viêm xoang', 'viêm họng', 'khàn giọng'],
      en: ['sore throat', 'stuffy nose', 'nosebleed', 'tinnitus', 'hearing loss', 'sinusitis', 'hoarse voice'],
    },
  },
  {
    id: 'ophthalmology',
    emoji: '👁️',
    nameKey: 'specOphthalmology',
    doctors: 14,
    keywords: {
      vi: ['mắt đỏ', 'mờ mắt', 'đau mắt', 'chảy nước mắt', 'nhìn đôi', 'cận thị', 'đục thủy tinh thể', 'tăng nhãn áp'],
      en: ['red eyes', 'blurry vision', 'eye pain', 'watery eyes', 'double vision', 'myopia', 'cataract', 'glaucoma'],
    },
  },
  {
    id: 'pediatrics',
    emoji: '👶',
    nameKey: 'specPediatrics',
    doctors: 26,
    keywords: {
      vi: ['trẻ em', 'con', 'bé', 'sốt cao', 'nhi khoa', 'ho trẻ em', 'tiêu chảy trẻ em'],
      en: ['child', 'baby', 'infant', 'pediatric', 'kids', 'children fever'],
    },
  },
  {
    id: 'respiratory',
    emoji: '🫁',
    nameKey: 'specRespiratory',
    doctors: 17,
    keywords: {
      vi: ['ho', 'khó thở', 'hen suyễn', 'phổi', 'viêm phổi', 'lao phổi', 'ho ra máu', 'thở khò khè'],
      en: ['cough', 'dyspnea', 'asthma', 'lung', 'pneumonia', 'tuberculosis', 'wheezing', 'respiratory'],
    },
  },
  {
    id: 'endocrinology',
    emoji: '🩸',
    nameKey: 'specEndocrinology',
    doctors: 13,
    keywords: {
      vi: ['tiểu đường', 'béo phì', 'tuyến giáp', 'hormone', 'đái tháo đường', 'mệt mỏi mãn tính', 'sụt cân'],
      en: ['diabetes', 'obesity', 'thyroid', 'hormone', 'fatigue', 'weight loss', 'endocrine'],
    },
  },
  {
    id: 'oncology',
    emoji: '🎗️',
    nameKey: 'specOncology',
    doctors: 19,
    keywords: {
      vi: ['ung thư', 'u bướu', 'khối u', 'ung bướu', 'hóa trị', 'xạ trị'],
      en: ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation', 'malignant'],
    },
  },
  {
    id: 'urology',
    emoji: '🫘',
    nameKey: 'specUrology',
    doctors: 12,
    keywords: {
      vi: ['đau thận', 'sỏi thận', 'tiết niệu', 'tiểu buốt', 'tiểu ra máu', 'nhiễm trùng tiết niệu'],
      en: ['kidney', 'urinary', 'urination', 'bladder', 'prostate', 'UTI', 'kidney stone'],
    },
  },
];

window.DOCTORS = {
  neurology: [
    { id: 'd1', name: 'GS.TS Nguyễn Văn Linh', nameEn: 'Prof. Nguyen Van Linh', title: 'GS.TS', specialty: 'neurology', emoji: '👨‍⚕️', experience: '25 năm', rating: '4.9', reviews: 342, doctor_profile_endpoint: '/bac-si/d1', doctorProfileEndpoint: '/bac-si/d1' },
    { id: 'd2', name: 'PGS.TS Trần Thị Mai', nameEn: 'Assoc.Prof. Tran Thi Mai', title: 'PGS.TS', specialty: 'neurology', emoji: '👩‍⚕️', experience: '18 năm', rating: '4.8', reviews: 289, doctor_profile_endpoint: '/bac-si/d2', doctorProfileEndpoint: '/bac-si/d2' },
    { id: 'd3', name: 'TS.BSCK2 Lê Minh Đức', nameEn: 'Dr. Le Minh Duc', title: 'TS.BSCK2', specialty: 'neurology', emoji: '👨‍⚕️', experience: '14 năm', rating: '4.7', reviews: 198, doctor_profile_endpoint: '/bac-si/d3', doctorProfileEndpoint: '/bac-si/d3' },
  ],
  cardiology: [
    { id: 'd4', name: 'GS.TS Phạm Thế Anh', nameEn: 'Prof. Pham The Anh', title: 'GS.TS', specialty: 'cardiology', emoji: '👨‍⚕️', experience: '30 năm', rating: '5.0', reviews: 521, doctor_profile_endpoint: '/bac-si/d4', doctorProfileEndpoint: '/bac-si/d4' },
    { id: 'd5', name: 'PGS.TS Hoàng Thị Lan', nameEn: 'Assoc.Prof. Hoang Thi Lan', title: 'PGS.TS', specialty: 'cardiology', emoji: '👩‍⚕️', experience: '22 năm', rating: '4.9', reviews: 388, doctor_profile_endpoint: '/bac-si/d5', doctorProfileEndpoint: '/bac-si/d5' },
    { id: 'd6', name: 'TS.BSCK2 Vũ Thanh Hùng', nameEn: 'Dr. Vu Thanh Hung', title: 'TS.BSCK2', specialty: 'cardiology', emoji: '👨‍⚕️', experience: '16 năm', rating: '4.8', reviews: 244, doctor_profile_endpoint: '/bac-si/d6', doctorProfileEndpoint: '/bac-si/d6' },
  ],
  gastro: [
    { id: 'd7', name: 'PGS.TS Đỗ Thành Nam', nameEn: 'Assoc.Prof. Do Thanh Nam', title: 'PGS.TS', specialty: 'gastro', emoji: '👨‍⚕️', experience: '20 năm', rating: '4.8', reviews: 267, doctor_profile_endpoint: '/bac-si/d7', doctorProfileEndpoint: '/bac-si/d7' },
    { id: 'd8', name: 'TS.BSCK2 Nguyễn Thị Hoa', nameEn: 'Dr. Nguyen Thi Hoa', title: 'TS.BSCK2', specialty: 'gastro', emoji: '👩‍⚕️', experience: '15 năm', rating: '4.7', reviews: 182, doctor_profile_endpoint: '/bac-si/d8', doctorProfileEndpoint: '/bac-si/d8' },
  ],
  orthopedics: [
    { id: 'd9', name: 'GS.TS Trần Đình Chiến', nameEn: 'Prof. Tran Dinh Chien', title: 'GS.TS', specialty: 'orthopedics', emoji: '👨‍⚕️', experience: '28 năm', rating: '4.9', reviews: 445, doctor_profile_endpoint: '/bac-si/d9', doctorProfileEndpoint: '/bac-si/d9' },
    { id: 'd10', name: 'PGS.TS Lê Thị Phương', nameEn: 'Assoc.Prof. Le Thi Phuong', title: 'PGS.TS', specialty: 'orthopedics', emoji: '👩‍⚕️', experience: '19 năm', rating: '4.8', reviews: 301, doctor_profile_endpoint: '/bac-si/d10', doctorProfileEndpoint: '/bac-si/d10' },
  ],
  dermatology: [
    { id: 'd11', name: 'TS.BSCK2 Nguyễn Hữu Quang', nameEn: 'Dr. Nguyen Huu Quang', title: 'TS.BSCK2', specialty: 'dermatology', emoji: '👨‍⚕️', experience: '16 năm', rating: '4.8', reviews: 213, doctor_profile_endpoint: '/bac-si/d11', doctorProfileEndpoint: '/bac-si/d11' },
    { id: 'd12', name: 'Th.S BSCK1 Phạm Thị Thu', nameEn: 'Dr. Pham Thi Thu', title: 'THAC', specialty: 'dermatology', emoji: '👩‍⚕️', experience: '11 năm', rating: '4.7', reviews: 156, doctor_profile_endpoint: '/bac-si/d12', doctorProfileEndpoint: '/bac-si/d12' },
  ],
  ent: [
    { id: 'd13', name: 'PGS.TS Đinh Văn Thành', nameEn: 'Assoc.Prof. Dinh Van Thanh', title: 'PGS.TS', specialty: 'ent', emoji: '👨‍⚕️', experience: '21 năm', rating: '4.8', reviews: 278, doctor_profile_endpoint: '/bac-si/d13', doctorProfileEndpoint: '/bac-si/d13' },
    { id: 'd14', name: 'TS.BSCK2 Bùi Thị Nga', nameEn: 'Dr. Bui Thi Nga', title: 'TS.BSCK2', specialty: 'ent', emoji: '👩‍⚕️', experience: '13 năm', rating: '4.7', reviews: 167, doctor_profile_endpoint: '/bac-si/d14', doctorProfileEndpoint: '/bac-si/d14' },
  ],
  ophthalmology: [
    { id: 'd15', name: 'GS.TS Phan Đức Long', nameEn: 'Prof. Phan Duc Long', title: 'GS.TS', specialty: 'ophthalmology', emoji: '👨‍⚕️', experience: '26 năm', rating: '4.9', reviews: 398, doctor_profile_endpoint: '/bac-si/d15', doctorProfileEndpoint: '/bac-si/d15' },
    { id: 'd16', name: 'PGS.TS Vũ Thị Bích', nameEn: 'Assoc.Prof. Vu Thi Bich', title: 'PGS.TS', specialty: 'ophthalmology', emoji: '👩‍⚕️', experience: '17 năm', rating: '4.8', reviews: 231, doctor_profile_endpoint: '/bac-si/d16', doctorProfileEndpoint: '/bac-si/d16' },
  ],
  respiratory: [
    { id: 'd17', name: 'PGS.TS Nguyễn Thanh Bình', nameEn: 'Assoc.Prof. Nguyen Thanh Binh', title: 'PGS.TS', specialty: 'respiratory', emoji: '👨‍⚕️', experience: '22 năm', rating: '4.9', reviews: 312, doctor_profile_endpoint: '/bac-si/d17', doctorProfileEndpoint: '/bac-si/d17' },
    { id: 'd18', name: 'TS.BSCK2 Trần Thị Hiên', nameEn: 'Dr. Tran Thi Hien', title: 'TS.BSCK2', specialty: 'respiratory', emoji: '👩‍⚕️', experience: '14 năm', rating: '4.7', reviews: 189, doctor_profile_endpoint: '/bac-si/d18', doctorProfileEndpoint: '/bac-si/d18' },
  ],
  endocrinology: [
    { id: 'd19', name: 'GS.TS Lê Văn Hùng', nameEn: 'Prof. Le Van Hung', title: 'GS.TS', specialty: 'endocrinology', emoji: '👨‍⚕️', experience: '24 năm', rating: '4.9', reviews: 356, doctor_profile_endpoint: '/bac-si/d19', doctorProfileEndpoint: '/bac-si/d19' },
    { id: 'd20', name: 'PGS.TS Nguyễn Thị Cúc', nameEn: 'Assoc.Prof. Nguyen Thi Cuc', title: 'PGS.TS', specialty: 'endocrinology', emoji: '👩‍⚕️', experience: '18 năm', rating: '4.8', reviews: 234, doctor_profile_endpoint: '/bac-si/d20', doctorProfileEndpoint: '/bac-si/d20' },
  ],
  pediatrics: [
    { id: 'd21', name: 'GS.TS Phạm Nhật An', nameEn: 'Prof. Pham Nhat An', title: 'GS.TS', specialty: 'pediatrics', emoji: '👨‍⚕️', experience: '29 năm', rating: '5.0', reviews: 612, doctor_profile_endpoint: '/bac-si/d21', doctorProfileEndpoint: '/bac-si/d21' },
    { id: 'd22', name: 'PGS.TS Nguyễn Thu Hương', nameEn: 'Assoc.Prof. Nguyen Thu Huong', title: 'PGS.TS', specialty: 'pediatrics', emoji: '👩‍⚕️', experience: '20 năm', rating: '4.9', reviews: 441, doctor_profile_endpoint: '/bac-si/d22', doctorProfileEndpoint: '/bac-si/d22' },
  ],
  oncology: [
    { id: 'd23', name: 'GS.TS Trần Văn Sáng', nameEn: 'Prof. Tran Van Sang', title: 'GS.TS', specialty: 'oncology', emoji: '👨‍⚕️', experience: '27 năm', rating: '4.9', reviews: 289, doctor_profile_endpoint: '/bac-si/d23', doctorProfileEndpoint: '/bac-si/d23' },
  ],
  urology: [
    { id: 'd24', name: 'PGS.TS Nguyễn Đức Minh', nameEn: 'Assoc.Prof. Nguyen Duc Minh', title: 'PGS.TS', specialty: 'urology', emoji: '👨‍⚕️', experience: '19 năm', rating: '4.8', reviews: 201, doctor_profile_endpoint: '/bac-si/d24', doctorProfileEndpoint: '/bac-si/d24' },
  ],
};

// Featured doctors for homepage
window.FEATURED_DOCTORS = [
  window.DOCTORS.neurology[0],
  window.DOCTORS.cardiology[0],
  window.DOCTORS.pediatrics[0],
  window.DOCTORS.orthopedics[0],
];

// Generate time slots
window.getTimeSlots = function(doctorId) {
  const today = new Date();
  const slots = [];
  const times = ['08:00', '09:00', '10:00', '13:30', '14:30', '15:30'];
  for (let d = 0; d < 5; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d + (d === 0 ? 0 : 0));
    const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const dateStrEn = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
    const dayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    const available = times.filter(() => Math.random() > 0.35);
    if (available.length > 0) {
      available.forEach(time => {
        slots.push({
          id: `${doctorId}-${d}-${time}`,
          date: dateStr,
          dateEn: dateStrEn,
          dayVi,
          dayEn,
          time,
          label: `${dayVi} ${dateStr} – ${time}`,
          labelEn: `${dayEn}, ${dateStrEn} – ${time}`,
        });
      });
    }
  }
  return slots.slice(0, 8);
};

// Symptom analysis → specialty
window.analyzeSymptom = function(text, lang = 'vi') {
  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  window.SPECIALTIES.forEach(spec => {
    const keywords = spec.keywords[lang] || spec.keywords.vi;
    let score = 0;
    keywords.forEach(kw => {
      if (lower.includes(kw.toLowerCase())) score++;
    });
    if (score > bestScore) {
      bestScore = score;
      bestMatch = spec;
    }
  });

  // Fallback scoring from the other language
  if (bestScore === 0) {
    window.SPECIALTIES.forEach(spec => {
      const altLang = lang === 'vi' ? 'en' : 'vi';
      const keywords = spec.keywords[altLang] || [];
      let score = 0;
      keywords.forEach(kw => {
        if (lower.includes(kw.toLowerCase())) score++;
      });
      if (score > bestScore) {
        bestScore = score;
        bestMatch = spec;
      }
    });
  }

  return bestScore > 0 ? bestMatch : null;
};
