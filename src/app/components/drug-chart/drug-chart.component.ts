//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
import { Component, ElementRef, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation, EventEmitter } from '@angular/core';
import { forkJoin, interval, of, Subscription } from 'rxjs';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import { TimelineServiceService } from '../../services/timeline-service.service'
import { AppService } from "src/app/services/app.service"
import { DrugChart, PersonAwayPeriod, Posology, Prescription, PrescriptionMedicaitonSupply } from 'src/app/models/EPMA';
import moment from 'moment';
import { TimeerHelper } from '../drug-chart/timer-helper'

import { SubjectsService } from 'src/app/services/subjects.service';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import { HostListener } from "@angular/core";
import { RoleAction } from 'src/app/services/enum';
import { DataRequest } from 'src/app/services/datarequest';

@Component({
  selector: 'app-drug-chart',
  templateUrl: './drug-chart.component.html',
  styleUrls: ['./drug-chart.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DrugChartComponent implements OnInit, OnDestroy {

  timediv: Timeline;
  medicationAdministrationEmptyTemplate = "";

  numberOfEmptyTemplates: number;

  startDate;
  endDate;
  @Input() groupFilterType;

  isZoomCssApplied = false;

  isitemclickedboolean = false;
  showAdministrationForm: boolean = false;
  showEditpopup: boolean = false;

  showContextMenu: boolean = false;
  contextmenuX = 0;
  contextmenuY = 0;
  contextdistype = "none"
  editpopuptypetype = ""
  PrescriptionAdmistration: Prescription;

  displayeventtime: any;
  doctorConformationModel: boolean = false;
  selectedDose: any;
  timeerHelper: TimeerHelper;
  errorgeneratingevents = false;
  range: any;
  menuArray: any[];

  subscription: Subscription = new Subscription();
  @Output() emitPrintIcon = new EventEmitter<any>();



  @ViewChild('timecomponentid', { static: false }) timecomponentid: ElementRef;


  constructor(public dr: DataRequest,
    public subjects: SubjectsService,
    private timelineService: TimelineServiceService,
    public appService: AppService,
    private apiRequest: ApirequestService) {

  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.timelineService.Reset();
    this.timeerHelper = null;
    for (var timelinearray of this.appService.TimelineArray) {
      timelinearray.timeline.destroy();
      timelinearray.group = null;
      timelinearray.items = null;
      timelinearray.options = null;
      timelinearray.PRNArray = null;
    }
    this.appService.TimelineArray = null;
    this.medicationAdministrationEmptyTemplate = "";
    this.timediv.destroy();
  }

  destroyRecordsTemplate() {
    //this.medicationAdministrationEmptyTemplate = "";
 
  }

  ngOnInit(): void {

    const patientDetails$ = this.apiRequest.getRequest(this.appService.baseURI + `/GetBaseViewListByAttribute/patientbanner_mainbanner?synapseattributename=person_id&attributevalue=${this.appService.personId}`);
    const encounterDetails$ = this.apiRequest.getRequest(this.appService.baseURI + `/GetObject?synapsenamespace=core&synapseentityname=encounter&id=${this.appService.encounter.encounter_id}`);
    let prescriptionHistory$ = this.appService.Prescription.length ? this.apiRequest
      .postRequest(
        this.appService.baseURI + '/GetBaseViewListByPost/epma_reviewhistory',
        this.CreateSessionFilter()
      ) : of(null);
    forkJoin([patientDetails$, encounterDetails$, prescriptionHistory$]).subscribe(responseList => {
      this.appService.patientDetails = JSON.parse(responseList[0])[0];
      this.appService.encounterDetails = JSON.parse(responseList[1]);
      this.appService.disabledatechange = false;
      if (this.appService.Prescription.length) {
        for (let prescription of responseList[2]) {
          prescription.__posology = JSON.parse(prescription.__posology);
          prescription.__routes = JSON.parse(prescription.__routes);
          prescription.__medications = JSON.parse(prescription.__medications);
          this.appService.prescriptionHistory.push(<Prescription>prescription);
        }
        this.appService.prescriptionHistory.forEach(presHistory => {
          presHistory.history_status = this.getPrescriptionStatus(presHistory);
        });
      }

      this.timeerHelper = new TimeerHelper(this.appService);
      let MaxEventDate = moment(this.appService.changechoosenFilterDate).add(8, 'days');
      let minEventDate = moment(this.appService.changechoosenFilterDate).add(-8, 'days');
      try {
        this.timeerHelper.createEvents(minEventDate, MaxEventDate);
        this.errorgeneratingevents = false
  
      }
      catch (error) {
        this.errorgeneratingevents = true
        alert("Error generating events on drug chart");
        console.log(error);
      }


      //click print here 
      setTimeout(() => {
        this.medicationAdministrationEmptyTemplate = 'active'
      }, 100);

    });
  }

  CreateSessionFilter() {
    let condition = '';

    const pm = new filterParams();
    const pres_ids = []
    this.appService.Prescription.forEach(pres => {
      pres_ids.push(pres.prescription_id);
    });
    for (var i = 0; i < pres_ids.length; i++) {
      condition += "or prescription_id = @prescription_id" + i + " ";
      pm.filterparams.push(new filterparam("prescription_id" + i, pres_ids[i]));
    }
    condition = condition.replace(/^\or+|\or+$/g, '');
    let f = new filters();
    f.filters.push(new filter(condition));
    const select = new selectstatement('SELECT *');

    const orderby = new orderbystatement('ORDER BY 2');

    const body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  getPrescriptionStatus(pres: Prescription | { prescriptionstatus_id: string }) {
    var status = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == pres.prescriptionstatus_id);
    if (status)
      return this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == pres.prescriptionstatus_id).status;
    else
      return "active";
  }
}
