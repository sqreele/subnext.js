// ./app/components/ducument/JobsPDFGenerator.tsx
"use client"; // Assuming this might be needed

import React, { useMemo } from 'react'; // Added useMemo import
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Job, TabValue, FILTER_TITLES, JobPriority, JobStatus, Property, User } from '@/app/lib/types'; // Import needed types

// Register Thai font (consider hosting locally or using a more stable CDN/package)
Font.register({
  family: 'Noto Sans Thai',
  // Ensure this URL is accessible and correct
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@4.5.0/files/noto-sans-thai-all-400-normal.woff',
});

// Register font for bold text
Font.register({
  family: 'Noto Sans Thai Bold',
  // Ensure this URL is accessible and correct
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@4.5.0/files/noto-sans-thai-all-700-normal.woff',
  fontWeight: 'bold', // Note: fontWeight support in @react-pdf/renderer might vary
});

interface JobsPDFDocumentProps {
  jobs: Job[];
  filter: TabValue;
  selectedProperty?: string | null; // Property ID (string assumed)
  propertyName?: string;
}

// --- Styles ---
const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 60, // Increased bottom padding for footer
    paddingHorizontal: 30,
    backgroundColor: '#ffffff',
    fontFamily: 'Noto Sans Thai',
    fontSize: 10, // Default font size
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1.5,
    borderColor: '#cccccc',
    paddingBottom: 10,
    textAlign: 'center',
  },
  headerText: {
    fontSize: 16,
    fontFamily: 'Noto Sans Thai Bold', // Use registered bold font family
    marginBottom: 5,
    color: '#333333',
  },
  subHeaderText: {
    fontSize: 12,
    marginBottom: 8,
    color: '#555555',
  },
  infoText: {
    fontSize: 10,
    color: '#666666',
  },
  jobRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eeeeee',
    paddingVertical: 10,
    marginBottom: 10,
    // Ensure rows don't break across pages if possible (may not always work)
    // wrap: false, // This can cause layout issues, use with caution
  },
  imageColumn: {
    width: '25%', // Adjusted width
    paddingRight: 10,
  },
  infoColumn: {
    width: '40%', // Adjusted width
    paddingRight: 10,
    display: 'flex', // Use flex for vertical layout of info items
    flexDirection: 'column',
  },
  dateColumn: {
    width: '35%', // Adjusted width
  },
  jobImage: {
    width: '100%',
    height: 80, // Adjusted height
    objectFit: 'cover',
    borderRadius: 3,
    backgroundColor: '#f0f0f0', // Background color for image area
  },
  label: {
    fontSize: 9,
    color: '#555555',
    marginBottom: 2,
    fontFamily: 'Noto Sans Thai Bold', // Bold label
  },
  value: {
    fontSize: 9,
    marginBottom: 6,
    color: '#333333',
  },
  badge: { // Generic badge style
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
    marginBottom: 6,
    textAlign: 'center', // Center text within badge
    // display: 'inline-block', // <<< REMOVED THIS LINE - Not supported
    // Use alignSelf instead of relying on inline-block for positioning
    alignSelf: 'flex-start', // Make badge only as wide as its content within the flex column
  },
  // Specific badge styles can override generic ones if needed
  statusBadge: {},
  priorityBadge: {},
  dateText: {
    fontSize: 9,
    marginBottom: 3,
    color: '#444444',
  },
  noImage: {
    width: '100%',
    height: 80, // Match image height
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    display: 'flex', // Use flex for alignment
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 9,
    color: '#999999',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#aaaaaa',
  },
  roomInfo: {
    marginBottom: 6,
  },
  // Add page number styling
  pageNumber: {
     position: 'absolute',
     fontSize: 8,
     bottom: 15,
     left: 0,
     right: 30, // Align to right
     textAlign: 'right',
     color: 'grey',
   },
});

// --- Helper Functions ---
const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) { return 'Invalid Date'; }
        // Format for Thai locale, only date part
        return date.toLocaleDateString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
};

const getPriorityStyle = (priority: JobPriority) => {
    switch (priority) {
        case 'high': return { backgroundColor: '#FFEBEE', color: '#D32F2F' };
        case 'medium': return { backgroundColor: '#FFF3E0', color: '#F57C00' };
        case 'low': return { backgroundColor: '#E8F5E9', color: '#388E3C' };
        default: return { backgroundColor: '#F5F5F5', color: '#555555' };
    }
};

const getStatusStyle = (status: JobStatus) => {
    switch (status) {
        case 'pending': return { backgroundColor: '#FFF3E0', color: '#F57C00' };
        case 'in_progress': return { backgroundColor: '#E3F2FD', color: '#1976D2' };
        case 'completed': return { backgroundColor: '#E8F5E9', color: '#388E3C' };
        case 'cancelled': return { backgroundColor: '#FFEBEE', color: '#D32F2F' };
        case 'waiting_sparepart': return { backgroundColor: '#EDE7F6', color: '#5E35B1' };
        default: return { backgroundColor: '#F5F5F5', color: '#555555' };
    }
};

const translatePriority = (priority: JobPriority): string => {
    switch (priority) {
        case 'high': return 'สูง';
        case 'medium': return 'ปานกลาง';
        case 'low': return 'ต่ำ';
        default: return priority;
    }
};

const translateStatus = (status: JobStatus): string => {
  switch (status) {
     case 'pending': return 'รอดำเนินการ';
     case 'in_progress': return 'กำลังดำเนินการ';
     case 'completed': return 'เสร็จสิ้น';
     case 'cancelled': return 'ยกเลิก';
     case 'waiting_sparepart': return 'รออะไหล่';
     default:
          // This case should be unreachable if 'status' strictly adheres to JobStatus type.
          // Handle the 'never' type safely by casting or providing a fixed fallback.
          console.warn(`Unexpected job status encountered in translateStatus: ${status}`);

          // Option A: Cast to string before replacing (provides some info if status is an unexpected string)
          const exhaustiveCheck: never = status; // Optional: Check exhaustiveness at compile time
          return String(exhaustiveCheck).replace('_', ' ');

          // Option B: Fixed fallback string
          // return "สถานะไม่ทราบ";
 }
};

const getUserDisplay = (userField: number | string | User | undefined | null): string => {
    if (!userField) { return 'ยังไม่ได้มอบหมาย'; }
    if (typeof userField === 'object' && userField !== null && 'username' in userField) { return userField.username; }
    return String(userField);
};

// --- PDF Document Component ---
const JobsPDFDocument: React.FC<JobsPDFDocumentProps> = ({ jobs, filter, selectedProperty, propertyName }) => {

    // Filter jobs based on the selected property ONLY IF a property is selected
    const filteredJobs = useMemo(() => {
        if (!selectedProperty) {
            return jobs; // No property selected, show all jobs passed in
        }
        return jobs.filter((job) => {
            // Check direct property_id match on the job itself
            const directMatch = job.property_id !== undefined && job.property_id !== null &&
                                String(job.property_id) === String(selectedProperty);
            if (directMatch) return true;

            // Check if any associated rooms belong to the selected property
            const roomMatch = job.rooms?.some(room =>
                room.properties?.some(prop => {
                    // Check property association (can be ID or nested object)
                    const propId = (typeof prop === 'object' && prop !== null && 'property_id' in prop)
                                      ? prop.property_id
                                      : String(prop);
                    return String(propId) === String(selectedProperty);
                })
            );
            if (roomMatch) return true;

            // Exclude if no match found
            return false;
        });
    }, [jobs, selectedProperty]);


  return (
    <Document title={`${propertyName ? propertyName + ' - ' : ''}${FILTER_TITLES[filter] || 'Job Report'}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed> {/* Fixed header */}
          <Text style={styles.headerText}>{propertyName || 'รายงานสรุปงานซ่อมบำรุง'}</Text>
          <Text style={styles.subHeaderText}>{FILTER_TITLES[filter] || 'รายงานทั้งหมด'}</Text>
          <Text style={styles.infoText}>จำนวนงาน: {filteredJobs.length} | วันที่พิมพ์: {formatDate(new Date().toISOString())}</Text>
        </View>

        {/* Job List */}
        {filteredJobs.length > 0 ? filteredJobs.map((job) => {
           const priorityStyle = getPriorityStyle(job.priority);
           const statusStyle = getStatusStyle(job.status);

           return (
            <View key={job.job_id || job.id} style={styles.jobRow} wrap={false}> {/* Prevent row breaking */}
                {/* Image Column */}
                <View style={styles.imageColumn}>
                 {job.images && job.images.length > 0 && job.images[0].image_url ? (
                    <Image
                        src={{ uri: job.images[0].image_url, method: 'GET', headers: {}, body: '' }} // Use object for src if needed for headers later
                        style={styles.jobImage}
                    />
                 ) : (
                    <View style={styles.noImage}>
                        <Text style={styles.noImageText}>ไม่มีรูปภาพ</Text>
                    </View>
                 )}
                </View>

                {/* Info Column */}
                <View style={styles.infoColumn}>
                    <View style={styles.roomInfo}>
                         <Text style={styles.label}>
                             สถานที่: {job.rooms && job.rooms.length > 0 ? job.rooms.map(r => r.name).join(', ') : 'N/A'}
                         </Text>
                         {/* Optionally display room type */}
                         {job.rooms && job.rooms.length > 0 && job.rooms[0].room_type && (
                            <Text style={{ fontSize: 8, color: '#777' }}>ประเภท: {job.rooms[0].room_type}</Text>
                         )}
                    </View>

                    <Text style={styles.value}>
                        <Text style={styles.label}>หัวข้อ: </Text>
                        {job.topics && job.topics.length > 0 ? job.topics.map(topic => topic.title || 'N/A').join(', ') : 'ไม่มี'}
                    </Text>

                    <Text style={[styles.badge, styles.statusBadge, statusStyle]}>
                         สถานะ: {translateStatus(job.status)}
                    </Text>

                    <Text style={[styles.badge, styles.priorityBadge, priorityStyle]}>
                         ความสำคัญ: {translatePriority(job.priority)}
                    </Text>

                    <Text style={styles.value}>
                        <Text style={styles.label}>พนักงาน: </Text>
                        {getUserDisplay(job.user)}
                    </Text>
                     <Text style={styles.value}>
                        <Text style={styles.label}>Job ID: </Text>
                        {job.job_id}
                     </Text>
                </View>

                {/* Date & Details Column */}
                <View style={styles.dateColumn}>
                    {job.description && (
                        <>
                         <Text style={styles.label}>รายละเอียด:</Text>
                         <Text style={styles.value}>{job.description}</Text>
                        </>
                    )}
                    {job.remarks && (
                        <>
                         <Text style={styles.label}>หมายเหตุ:</Text>
                         <Text style={styles.value}>{job.remarks}</Text>
                        </>
                    )}
                    <Text style={styles.dateText}>สร้างเมื่อ: {formatDate(job.created_at)}</Text>
                    <Text style={styles.dateText}>อัปเดตเมื่อ: {formatDate(job.updated_at)}</Text>
                    {job.completed_at && (
                        <Text style={styles.dateText}>เสร็จสิ้นเมื่อ: {formatDate(job.completed_at)}</Text>
                    )}
                     {job.is_defective && (
                         <Text style={{...styles.value, color: '#D32F2F', fontSize: 9}}>(Defective)</Text>
                     )}
                     {job.is_preventivemaintenance && (
                          <Text style={{...styles.value, color: '#1976D2', fontSize: 9}}>(Preventive)</Text>
                     )}
                </View>
            </View>
           );
        }) : (
            <View style={{ textAlign: 'center', marginTop: 50 }}>
                <Text style={{ fontSize: 12, color: '#888888' }}>ไม่มีงานที่ตรงกับเงื่อนไขที่เลือก</Text>
            </View>
        )}

        {/* Footer with Page Number */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />

      </Page>
    </Document>
  );
};

export default JobsPDFDocument;