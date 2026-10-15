from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from werkzeug.utils import secure_filename
from models.stored_file import StoredFile
from extensions import db

holidays_bp = Blueprint('holidays', __name__)

ALLOWED_EXTENSIONS = {'pdf'}
HOLIDAY_CATEGORY = 'holiday'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@holidays_bp.route('/pdfs', methods=['GET'])
def list_pdfs():
    pdfs = StoredFile.query.filter_by(category=HOLIDAY_CATEGORY).order_by(StoredFile.created_at.desc()).all()
    return jsonify({'success': True, 'pdfs': [pdf.to_dict() for pdf in pdfs]}), 200


@holidays_bp.route('/pdfs', methods=['POST'])
@jwt_required()
def upload_pdf():
    claims = get_jwt()
    role = claims.get('role')
    if role != 'principal':
        return jsonify({'success': False, 'message': 'Forbidden: only principal may upload'}), 403

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    filename = secure_filename(file.filename)[-150:]
    if not filename or not allowed_file(filename):
        return jsonify({'success': False, 'message': 'Invalid file type'}), 400

    try:
        # Uploading a file with an existing name replaces it
        StoredFile.query.filter_by(category=HOLIDAY_CATEGORY, filename=filename).delete()
        data = file.read()
        stored = StoredFile(
            category=HOLIDAY_CATEGORY,
            filename=filename,
            content_type='application/pdf',
            size=len(data),
            data=data,
            uploaded_by=int(get_jwt_identity())
        )
        db.session.add(stored)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f'Holiday PDF upload error: {e}')
        return jsonify({'success': False, 'message': 'Upload failed', 'error': str(e)}), 500

    return jsonify({'success': True, 'filename': stored.filename, 'url': stored.url}), 201


@holidays_bp.route('/pdfs/<string:filename>', methods=['DELETE'])
@jwt_required()
def delete_pdf(filename):
    claims = get_jwt()
    role = claims.get('role')
    if role != 'principal':
        return jsonify({'success': False, 'message': 'Forbidden: only principal may delete'}), 403

    deleted = StoredFile.query.filter_by(category=HOLIDAY_CATEGORY, filename=filename).delete()
    if not deleted:
        return jsonify({'success': False, 'message': 'File not found'}), 404

    db.session.commit()
    return jsonify({'success': True, 'message': 'File deleted'}), 200
