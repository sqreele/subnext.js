// ./app/components/ducument/JobsPDFGenerator.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Job, TabValue, FILTER_TITLES } from '@/app/lib/types';

// Register Thai font
Font.register({
  family: 'Noto Sans Thai',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@4.5.0/files/noto-sans-thai-all-400-normal.woff',
});

// Register font for bold text
Font.register({
  family: 'Noto Sans Thai Bold',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@4.5.0/files/noto-sans-thai-all-700-normal.woff',
  fontWeight: 'bold',
});

interface JobsPDFDocumentProps {
  jobs: Job[];
  filter: TabValue;
  selectedProperty?: string | null;
  propertyName?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#ffffff',
    fontFamily: 'Noto Sans Thai',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#eee',
    padding: 10,
  },
  headerText: {
    fontSize: 16,
    fontFamily: 'Noto Sans Thai Bold',
    marginBottom: 5,
  },
  subHeaderText: {
    fontSize: 14,
    marginBottom: 5,
  },
  jobRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
    padding: 10,
    minHeight: 150,
    marginBottom: 10,
  },
  imageColumn: {
    width: '30%',
    marginRight: 15,
  },
  infoColumn: {
    width: '35%',
    paddingRight: 10,
  },
  dateColumn: {
    width: '35%',
  },
  jobImage: {
    width: '100%',
    height: 120,
    objectFit: 'cover',
    borderRadius: 4,
  },
  label: {
    fontSize: 10,
    color: '#666',
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    marginBottom: 8,
    lineHeight: 1.3,
  },
  statusBadge: {
    fontSize: 10,
    padding: 3,
    borderRadius: 4,
    backgroundColor: '#e6f0ff',
    color: '#1a56db',
    marginBottom: 8,
    width: 'auto',
    display: 'flex',
    alignSelf: 'flex-start',
  },
  priorityBadge: {
    fontSize: 10,
    padding: 3,
    borderRadius: 4,
    marginBottom: 8,
    width: 'auto',
    display: 'flex',
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: 10,
    marginBottom: 4,
  },
  noImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 10,
    color: '#999',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: '#999',
  },
  roomInfo: {
    marginBottom: 8,
  },
});

const JobsPDFDocument: React.FC<JobsPDFDocumentProps> = ({ jobs, filter, selectedProperty, propertyName }) => {
  const filteredJobs = jobs.filter((job) => {
    if (!selectedProperty) return true;
    
    return job.property_id === selectedProperty || 
           (job.profile_image?.properties.some(
             (prop) => String(prop.property_id) === selectedProperty
           )) || false;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#000000';
    }
  };

  const getPriorityBgColor = (priority: string) => {
    switch(priority) {
      case 'high': return '#FFEBEE';
      case 'medium': return '#FFF3E0';
      case 'low': return '#E8F5E9';
      default: return '#F5F5F5';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return '#1a56db';
      case 'in_progress': return '#FF9800';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#1a56db';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch(status) {
      case 'pending': return '#e6f0ff';
      case 'in_progress': return '#FFF3E0';
      case 'completed': return '#E8F5E9';
      case 'cancelled': return '#FFEBEE';
      default: return '#e6f0ff';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{propertyName || 'รายงานงาน'}</Text>
          <Text style={styles.subHeaderText}>{FILTER_TITLES[filter] || 'รายงานงาน'}</Text>
          <Text style={styles.label}>จำนวนงานทั้งหมด: {filteredJobs.length}</Text>
        </View>
        
        {filteredJobs.map((job) => (
          <View key={job.job_id} style={styles.jobRow}>
            <View style={styles.imageColumn}>
              {job.images && job.images.length > 0 ? (
                <Image
                  src={job.images[0].image_url}
                  style={styles.jobImage}
                />
              ) : (
                <View style={styles.noImage}>
                  <Text style={styles.noImageText}>ไม่มีรูปภาพ</Text>
                </View>
              )}
            </View>
            
            <View style={styles.infoColumn}>
              <View style={styles.roomInfo}>
                <Text style={styles.label}>
                  สถานที่: {job.rooms && job.rooms.length > 0 ? job.rooms[0].name : 'N/A'}
                </Text>
                {job.rooms && job.rooms.length > 0 && job.rooms[0].room_type && (
                  <Text style={styles.label}>ประเภทห้อง: {job.rooms[0].room_type}</Text>
                )}
              </View>
              
              <Text style={styles.label}>
                หัวข้อ: {job.topics && job.topics.length > 0 ? job.topics.map(topic => topic.title || 'N/A').join(', ') : 'ไม่มี'}
              </Text>
              
              <Text style={{
                ...styles.statusBadge,
                backgroundColor: getStatusBgColor(job.status),
                color: getStatusColor(job.status),
              }}>
                สถานะ: {job.status === 'pending' ? 'รอดำนินการ' : 
                       job.status === 'in_progress' ? 'กำลังดำเนินการ' : 
                       job.status === 'completed' ? 'เสร็จสิ้น' : 
                       job.status === 'cancelled' ? 'ยกเลิก' : 
                       job.status.replace('_', ' ')}
              </Text>
              
              <Text style={{
                ...styles.priorityBadge,
                backgroundColor: getPriorityBgColor(job.priority),
                color: getPriorityColor(job.priority),
              }}>
                ความสำคัญ: {job.priority === 'high' ? 'สูง' : 
                          job.priority === 'medium' ? 'ปานกลาง' : 
                          job.priority === 'low' ? 'ต่ำ' : job.priority}
              </Text>
              
              <Text style={styles.label}>
                พนักงาน: {job.user || 'ยังไม่ได้มอบหมาย'}
              </Text>
            </View>
            
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
            </View>
          </View>
        ))}
        
        <Text style={styles.footer}>
          พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </Page>
    </Document>
  );
};

export default JobsPDFDocument;
export { JobsPDFDocument };
