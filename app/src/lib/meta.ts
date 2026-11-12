/**
 * The fixed lists used in dropdowns (provinces, fields, qualification levels, opportunity types).
 * They are the same lists the API checks against (backend/src/utils/validate.ts) - keep both in step.
 */
import type { Meta } from './types';

export const META: Meta = {
  provinces: ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'],
  fields: [
    { slug: 'crop-production', name: 'Crop production' },
    { slug: 'animal-production', name: 'Animal production' },
    { slug: 'agri-economics', name: 'Agricultural economics & business' },
    { slug: 'agri-processing', name: 'Agro-processing & food science' },
    { slug: 'agri-engineering', name: 'Agricultural engineering & mechanisation' },
    { slug: 'horticulture', name: 'Horticulture' },
    { slug: 'natural-resources', name: 'Natural resources & environment' },
  ],
  levels: [
    { level: 0, name: 'Below Grade 12' },
    { level: 1, name: 'Grade 12 (Matric)' },
    { level: 2, name: 'Certificate (NQF 5)' },
    { level: 3, name: 'Diploma (NQF 6)' },
    { level: 4, name: 'Degree (NQF 7)' },
    { level: 5, name: 'Postgraduate (NQF 8+)' },
  ],
  types: [
    { slug: 'bursary', name: 'Bursary' },
    { slug: 'internship', name: 'Internship' },
    { slug: 'learnership', name: 'Learnership' },
    { slug: 'graduate_placement', name: 'Graduate placement' },
    { slug: 'programme', name: 'Programme' },
    { slug: 'job', name: 'Job' },
  ],
};

/** Small hook so screens read the lists the same way everywhere. */
export const useMeta = () => META;
